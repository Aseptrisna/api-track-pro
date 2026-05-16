import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Incident } from './schemas/incident.schema';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';

interface FindAllFilters {
  vehicleId?: string;
  type?:      string;
  status?:    string;
  page?:      number;
  limit?:     number;
}

@Injectable()
export class IncidentsService {
  constructor(
    @InjectModel(Incident.name) private incidentModel: Model<Incident>,
    @InjectModel(Vehicle.name)  private vehicleModel:  Model<Vehicle>,
  ) {}

  // ── helpers ──────────────────────────────────────────────────────────────────
  private oid(id: string) { return new Types.ObjectId(id); }

  private async resolveVehicle(vehicleId: string, ownerId: string) {
    const v = await this.vehicleModel.findOne({
      _id: this.oid(vehicleId),
      owner: this.oid(ownerId),
    });
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  async create(ownerId: string, dto: any) {
    const v = await this.resolveVehicle(dto.vehicleId, ownerId);

    return this.incidentModel.create({
      vehicle:             v._id,
      vehicle_name:        v.vehicle_name,
      plate_number:        v.plate_number,
      driver:              dto.driverId ? this.oid(dto.driverId) : null,
      driver_name:         dto.driver_name ?? '',
      date:                new Date(dto.date),
      type:                dto.type,
      severity:            dto.severity,
      description:         dto.description,
      location:            dto.location ?? '',
      damage_cost:         Number(dto.damage_cost) || 0,
      insurance_claim_ref: dto.insurance_claim_ref ?? '',
      repair_cost:         Number(dto.repair_cost) || 0,
      status:              dto.status ?? 'open',
      resolved_at:         dto.status === 'resolved' ? new Date() : null,
      owner:               this.oid(ownerId),
    });
  }

  async findAll(ownerId: string, filters: FindAllFilters) {
    const q: any = { owner: this.oid(ownerId) };
    if (filters.vehicleId && Types.ObjectId.isValid(filters.vehicleId)) {
      q.vehicle = this.oid(filters.vehicleId);
    }
    if (filters.type)   q.type   = filters.type;
    if (filters.status) q.status = filters.status;

    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.incidentModel.find(q).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      this.incidentModel.countDocuments(q),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getStats(ownerId: string) {
    const owner = this.oid(ownerId);
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

    const [openCount, yearlyStats, byType, bySeverity, byVehicle, trend] = await Promise.all([
      this.incidentModel.countDocuments({ owner, status: { $ne: 'resolved' } }),

      this.incidentModel.aggregate([
        { $match: { owner, date: { $gte: startOfYear } } },
        {
          $group: {
            _id: null,
            count:       { $sum: 1 },
            damage_cost: { $sum: '$damage_cost' },
            repair_cost: { $sum: '$repair_cost' },
          },
        },
      ]),

      this.incidentModel.aggregate([
        { $match: { owner, date: { $gte: startOfYear } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      this.incidentModel.aggregate([
        { $match: { owner, date: { $gte: startOfYear } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),

      this.incidentModel.aggregate([
        { $match: { owner, date: { $gte: startOfYear } } },
        {
          $group: {
            _id:          '$vehicle',
            vehicle_name: { $first: '$vehicle_name' },
            plate_number: { $first: '$plate_number' },
            count:        { $sum: 1 },
            total_cost:   { $sum: { $add: ['$damage_cost', '$repair_cost'] } },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      this.incidentModel.aggregate([
        { $match: { owner, date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    return {
      openCount,
      yearCount:   yearlyStats[0]?.count       ?? 0,
      damageCost:  yearlyStats[0]?.damage_cost ?? 0,
      repairCost:  yearlyStats[0]?.repair_cost ?? 0,
      byType:      byType.map((t: any) => ({ type: t._id, count: t.count })),
      bySeverity:  bySeverity.map((s: any) => ({ severity: s._id, count: s.count })),
      topVehicles: byVehicle,
      trend:       trend.map((t: any) => ({
        month: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
        count: t.count,
      })),
    };
  }

  async update(id: string, ownerId: string, dto: any) {
    const incident = await this.incidentModel.findOne({
      _id: this.oid(id),
      owner: this.oid(ownerId),
    });
    if (!incident) throw new NotFoundException('Incident not found');

    if (dto.vehicleId && String(incident.vehicle) !== dto.vehicleId) {
      const v = await this.resolveVehicle(dto.vehicleId, ownerId);
      incident.vehicle      = v._id as Types.ObjectId;
      incident.vehicle_name = v.vehicle_name;
      incident.plate_number = v.plate_number;
    }

    const fields: (keyof typeof dto)[] = [
      'type', 'severity', 'description', 'location',
      'insurance_claim_ref', 'driver_name',
    ];
    for (const f of fields) {
      if (dto[f] != null) (incident as any)[f] = dto[f];
    }
    if (dto.date)         incident.date        = new Date(dto.date);
    if (dto.damage_cost != null) incident.damage_cost = Number(dto.damage_cost);
    if (dto.repair_cost != null) incident.repair_cost = Number(dto.repair_cost);
    if (dto.driverId != null)    incident.driver      = dto.driverId ? this.oid(dto.driverId) : null;

    if (dto.status != null) {
      const wasResolved = incident.status === 'resolved';
      incident.status = dto.status;
      if (dto.status === 'resolved' && !wasResolved) {
        incident.resolved_at = new Date();
      } else if (dto.status !== 'resolved') {
        incident.resolved_at = null;
      }
    }

    return incident.save();
  }

  async remove(id: string, ownerId: string) {
    const r = await this.incidentModel.deleteOne({
      _id: this.oid(id),
      owner: this.oid(ownerId),
    });
    if (r.deletedCount === 0) throw new NotFoundException('Incident not found');
  }
}
