import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReportSchedule, ReportType, ReportFrequency } from './schemas/report-schedule.schema';

export interface CreateScheduleDto {
  report_type:      ReportType;
  frequency:        ReportFrequency;
  recipient_email:  string;
  enabled?:         boolean;
}

@Injectable()
export class ReportSchedulesService {
  constructor(
    @InjectModel(ReportSchedule.name)
    private readonly model: Model<ReportSchedule>,
  ) {}

  async findAll(userId: string) {
    return this.model.find({ user: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).lean();
  }

  async create(userId: string, dto: CreateScheduleDto): Promise<ReportSchedule> {
    return this.model.create({
      user:            new Types.ObjectId(userId),
      report_type:     dto.report_type,
      frequency:       dto.frequency,
      recipient_email: dto.recipient_email,
      enabled:         dto.enabled ?? true,
    });
  }

  async update(id: string, userId: string, dto: Partial<CreateScheduleDto & { enabled: boolean }>): Promise<ReportSchedule> {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Schedule not found');
    if (doc.user.toString() !== userId) throw new ForbiddenException();
    Object.assign(doc, dto);
    return doc.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Schedule not found');
    if (doc.user.toString() !== userId) throw new ForbiddenException();
    await doc.deleteOne();
  }

  async markSent(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { last_sent_at: new Date() });
  }

  /** Returns all enabled schedules that are due for sending */
  async findDue(): Promise<ReportSchedule[]> {
    const now = Date.now();
    const cutoffs: Record<ReportFrequency, number> = {
      daily:   now - 24 * 60 * 60 * 1000,
      weekly:  now - 7  * 24 * 60 * 60 * 1000,
      monthly: now - 30 * 24 * 60 * 60 * 1000,
    };

    // Find enabled schedules where last_sent_at is null OR older than their cutoff
    const all = await this.model.find({ enabled: true }).lean() as any[];
    return all.filter((s) => {
      const cutoff = cutoffs[s.frequency as ReportFrequency];
      return !s.last_sent_at || new Date(s.last_sent_at).getTime() < cutoff;
    });
  }
}
