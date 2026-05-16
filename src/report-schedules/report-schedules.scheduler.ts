import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReportSchedulesService } from './report-schedules.service';
import { ReportSchedule, ReportFrequency } from './schemas/report-schedule.schema';
import { MailService } from '../mail/mail.service';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';
import { Violation } from '../violations/schemas/violation.schema';
import { IdleLog } from '../idle-logs/schemas/idle-log.schema';

const PERIOD_DAYS: Record<ReportFrequency, number> = {
  daily:   1,
  weekly:  7,
  monthly: 30,
};

const FREQ_LABEL: Record<ReportFrequency, string> = {
  daily:   'Daily',
  weekly:  'Weekly',
  monthly: 'Monthly',
};

const TYPE_LABEL: Record<string, string> = {
  fleet_summary: 'Fleet Summary',
  violations:    'Speed Violations',
  idle_time:     'Idle Time',
};

@Injectable()
export class ReportSchedulesScheduler {
  private readonly logger = new Logger(ReportSchedulesScheduler.name);

  constructor(
    private readonly schedulesSvc: ReportSchedulesService,
    private readonly mailSvc:      MailService,
    @InjectModel(Vehicle.name)    private vehicleModel:   Model<Vehicle>,
    @InjectModel(Violation.name)  private violationModel: Model<Violation>,
    @InjectModel(IdleLog.name)    private idleLogModel:   Model<IdleLog>,
  ) {}

  @Cron('0 7 * * *', { name: 'report-schedules' })
  async processSchedules(): Promise<void> {
    const due = await this.schedulesSvc.findDue();
    if (!due.length) return;
    this.logger.log(`Processing ${due.length} due report schedule(s)`);

    for (const schedule of due) {
      try {
        await this.sendReport(schedule as any);
        await this.schedulesSvc.markSent(String(schedule._id));
      } catch (err) {
        this.logger.error(`Failed to send report ${schedule._id}: ${err.message}`);
      }
    }
  }

  async sendReport(schedule: ReportSchedule): Promise<void> {
    const freq    = schedule.frequency;
    const days    = PERIOD_DAYS[freq];
    const since   = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const ownerId = new Types.ObjectId(schedule.user);

    const subject = `[TrackPro] ${FREQ_LABEL[freq]} ${TYPE_LABEL[schedule.report_type]} Report`;
    const html    = await this.buildHtml(schedule, ownerId, since, days);

    await this.mailSvc.sendReport(schedule.recipient_email, subject, html);
  }

  // ── HTML assembly ────────────────────────────────────────────────────────────

  private async buildHtml(
    schedule: ReportSchedule,
    ownerId:  Types.ObjectId,
    since:    Date,
    days:     number,
  ): Promise<string> {
    const periodLabel = days === 1
      ? 'Yesterday'
      : `Last ${days} days`;

    switch (schedule.report_type) {
      case 'fleet_summary': return this.fleetSummaryHtml(ownerId, since, periodLabel, days);
      case 'violations':    return this.violationsHtml(ownerId, since, periodLabel);
      case 'idle_time':     return this.idleTimeHtml(ownerId, since, periodLabel);
      default:              return this.fleetSummaryHtml(ownerId, since, periodLabel, days);
    }
  }

  private async fleetSummaryHtml(
    ownerId:     Types.ObjectId,
    since:       Date,
    periodLabel: string,
    days:        number,
  ): Promise<string> {
    const [totalVehicles, violations, idleStats, topViolators] = await Promise.all([
      this.vehicleModel.countDocuments({ owner: ownerId }),
      this.violationModel.countDocuments({ owner: ownerId, timestamp: { $gte: since } }),
      this.idleLogModel.aggregate([
        { $match: { owner: ownerId, start_time: { $gte: since } } },
        { $group: { _id: null, events: { $sum: 1 }, totalMin: { $sum: '$duration_minutes' } } },
      ]),
      this.violationModel.aggregate([
        { $match: { owner: ownerId, timestamp: { $gte: since } } },
        { $group: { _id: '$vehicle', count: { $sum: 1 }, maxSpeed: { $max: '$speed' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'vehicles', localField: '_id', foreignField: '_id', as: 'v' } },
      ]),
    ]);

    const idleEvents   = idleStats[0]?.events  ?? 0;
    const idleHours    = Math.round((idleStats[0]?.totalMin ?? 0) / 60 * 10) / 10;

    const violatorRows = topViolators.map((r: any) => {
      const name = r.v?.[0]?.vehicle_name ?? r._id?.toString()?.slice(-6) ?? '—';
      const plate = r.v?.[0]?.plate_number ?? '';
      return `
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:8px 12px;">${name} <span style="color:#9ca3af;font-size:11px;">${plate}</span></td>
          <td style="padding:8px 12px;text-align:center;">${r.count}</td>
          <td style="padding:8px 12px;text-align:center;">${Math.round(r.maxSpeed)} km/h</td>
        </tr>`;
    }).join('');

    return this.wrapEmail(`Fleet Summary — ${periodLabel}`, `
      ${this.statBoxes([
        { label: 'Total Vehicles',  value: String(totalVehicles), color: '#059669' },
        { label: 'Violations',      value: String(violations),    color: violations > 0 ? '#ef4444' : '#059669' },
        { label: 'Idle Events',     value: String(idleEvents),    color: '#f59e0b' },
        { label: 'Total Idle',      value: `${idleHours}h`,       color: '#6366f1' },
      ])}
      ${topViolators.length ? `
        <h3 style="color:#374151;font-size:15px;margin:24px 0 8px;">Top Speed Violators</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:500;">Vehicle</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500;">Events</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500;">Max Speed</th>
            </tr>
          </thead>
          <tbody>${violatorRows}</tbody>
        </table>` : '<p style="color:#9ca3af;font-size:13px;">No violations recorded in this period.</p>'}
    `);
  }

  private async violationsHtml(
    ownerId:     Types.ObjectId,
    since:       Date,
    periodLabel: string,
  ): Promise<string> {
    const [summary, bySeverity, recentList] = await Promise.all([
      this.violationModel.countDocuments({ owner: ownerId, timestamp: { $gte: since } }),
      this.violationModel.aggregate([
        { $match: { owner: ownerId, timestamp: { $gte: since } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      this.violationModel.aggregate([
        { $match: { owner: ownerId, timestamp: { $gte: since } } },
        { $sort: { speed: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'v' } },
      ]),
    ]);

    const sevMap: Record<string, number> = {};
    bySeverity.forEach((s: any) => { sevMap[s._id] = s.count; });

    const rows = recentList.map((r: any) => {
      const name  = r.v?.[0]?.vehicle_name ?? '—';
      const plate = r.v?.[0]?.plate_number ?? '';
      const sev   = r.severity;
      const col   = sev === 'severe' ? '#ef4444' : sev === 'moderate' ? '#f97316' : '#f59e0b';
      const ts    = new Date(r.timestamp).toLocaleString('id-ID');
      return `
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:8px 12px;">${name} <span style="color:#9ca3af;font-size:11px;">${plate}</span></td>
          <td style="padding:8px 12px;text-align:center;font-weight:600;">${Math.round(r.speed)} km/h</td>
          <td style="padding:8px 12px;text-align:center;font-weight:600;">${r.speed_limit} km/h</td>
          <td style="padding:8px 12px;text-align:center;">
            <span style="color:${col};font-weight:600;text-transform:capitalize;">${sev}</span>
          </td>
          <td style="padding:8px 12px;font-size:11px;color:#6b7280;">${ts}</td>
        </tr>`;
    }).join('');

    return this.wrapEmail(`Speed Violations — ${periodLabel}`, `
      ${this.statBoxes([
        { label: 'Total Violations', value: String(summary),                        color: '#ef4444' },
        { label: 'Severe',           value: String(sevMap['severe']   ?? 0),         color: '#dc2626' },
        { label: 'Moderate',         value: String(sevMap['moderate'] ?? 0),         color: '#f97316' },
        { label: 'Mild',             value: String(sevMap['mild']     ?? 0),         color: '#f59e0b' },
      ])}
      ${summary > 0 ? `
        <h3 style="color:#374151;font-size:15px;margin:24px 0 8px;">Worst Violations (Top 10)</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:500;">Vehicle</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500;">Speed</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500;">Limit</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500;">Severity</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:500;">Time</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>` : '<p style="color:#9ca3af;font-size:13px;">No violations recorded in this period. Great job!</p>'}
    `);
  }

  private async idleTimeHtml(
    ownerId:     Types.ObjectId,
    since:       Date,
    periodLabel: string,
  ): Promise<string> {
    const [summary, perVehicle] = await Promise.all([
      this.idleLogModel.aggregate([
        { $match: { owner: ownerId, start_time: { $gte: since } } },
        { $group: { _id: null, events: { $sum: 1 }, totalMin: { $sum: '$duration_minutes' }, avgMin: { $avg: '$duration_minutes' } } },
      ]),
      this.idleLogModel.aggregate([
        { $match: { owner: ownerId, start_time: { $gte: since } } },
        { $group: { _id: '$vehicle_id', events: { $sum: 1 }, totalMin: { $sum: '$duration_minutes' }, maxMin: { $max: '$duration_minutes' } } },
        { $sort: { totalMin: -1 } },
        { $limit: 8 },
        { $lookup: { from: 'vehicles', localField: '_id', foreignField: '_id', as: 'v' } },
      ]),
    ]);

    const totalEvents = summary[0]?.events  ?? 0;
    const totalHours  = Math.round((summary[0]?.totalMin ?? 0) / 60 * 10) / 10;
    const avgMin      = Math.round(summary[0]?.avgMin ?? 0);

    const rows = perVehicle.map((r: any) => {
      const name   = r.v?.[0]?.vehicle_name ?? '—';
      const plate  = r.v?.[0]?.plate_number ?? '';
      const hours  = Math.round(r.totalMin / 60 * 10) / 10;
      const maxMin = Math.round(r.maxMin);
      const col    = hours >= 5 ? '#ef4444' : hours >= 2 ? '#f97316' : '#6b7280';
      return `
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:8px 12px;">${name} <span style="color:#9ca3af;font-size:11px;">${plate}</span></td>
          <td style="padding:8px 12px;text-align:center;">${r.events}</td>
          <td style="padding:8px 12px;text-align:center;font-weight:600;color:${col};">${hours}h</td>
          <td style="padding:8px 12px;text-align:center;color:#6b7280;">${maxMin}m</td>
        </tr>`;
    }).join('');

    return this.wrapEmail(`Idle Time — ${periodLabel}`, `
      ${this.statBoxes([
        { label: 'Idle Events',    value: String(totalEvents),            color: '#f59e0b' },
        { label: 'Total Idle',     value: `${totalHours}h`,               color: '#ef4444' },
        { label: 'Avg Duration',   value: `${avgMin}m`,                   color: '#6366f1' },
        { label: 'Vehicles',       value: String(perVehicle.length),      color: '#059669' },
      ])}
      ${totalEvents > 0 ? `
        <h3 style="color:#374151;font-size:15px;margin:24px 0 8px;">Idle Time per Vehicle</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:500;">Vehicle</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500;">Events</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500;">Total</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500;">Longest</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>` : '<p style="color:#9ca3af;font-size:13px;">No idle events recorded in this period.</p>'}
    `);
  }

  // ── Template helpers ─────────────────────────────────────────────────────────

  private statBoxes(items: Array<{ label: string; value: string; color: string }>): string {
    const boxes = items.map(({ label, value, color }) => `
      <div style="flex:1;min-width:120px;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;border:1px solid #e5e7eb;">
        <div style="font-size:24px;font-weight:700;color:${color};">${value}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">${label}</div>
      </div>`).join('');
    return `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;">${boxes}</div>`;
  }

  private wrapEmail(title: string, content: string): string {
    const now = new Date().toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:16px;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:660px;margin:0 auto;">
    <div style="background:#059669;padding:24px 28px;border-radius:8px 8px 0 0;">
      <div style="font-size:22px;font-weight:700;color:white;">🚛 TrackPro</div>
      <div style="font-size:16px;color:#a7f3d0;margin-top:4px;">${title}</div>
    </div>
    <div style="background:white;padding:24px 28px;">
      ${content}
    </div>
    <div style="background:#f9fafb;padding:14px 28px;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        Generated by TrackPro &middot; ${now}<br>
        <span style="font-size:11px;">You received this because a report schedule is configured on your account.</span>
      </p>
    </div>
  </div>
</body>
</html>`;
  }
}
