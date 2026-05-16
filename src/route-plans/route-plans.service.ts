import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RoutePlan, RoutePlanStatus } from './schemas/route-plan.schema';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';
import { Driver }  from '../drivers/schemas/driver.schema';

interface FindAllFilters {
  status?:    string;
  vehicleId?: string;
  startDate?: string;
  endDate?:   string;
  page?:      number;
  limit?:     number;
}

@Injectable()
export class RoutePlansService {
  constructor(
    @InjectModel(RoutePlan.name) private planModel:    Model<RoutePlan>,
    @InjectModel(Vehicle.name)   private vehicleModel: Model<Vehicle>,
    @InjectModel(Driver.name)    private driverModel:  Model<Driver>,
  ) {}

  private oid(id: string) { return new Types.ObjectId(id); }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  async create(ownerId: string, dto: any) {
    const vehicle = await this.vehicleModel.findOne({
      _id:   this.oid(dto.vehicleId),
      owner: this.oid(ownerId),
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    let driver_name = '';
    let driverOid:  Types.ObjectId | null = null;
    if (dto.driverId) {
      const driver = await this.driverModel.findOne({
        _id:   this.oid(dto.driverId),
        owner: this.oid(ownerId),
      });
      if (driver) { driverOid = driver._id as Types.ObjectId; driver_name = driver.name; }
    }

    return this.planModel.create({
      name:                   dto.name,
      vehicle:                vehicle._id,
      vehicle_name:           vehicle.vehicle_name,
      plate_number:           vehicle.plate_number,
      driver:                 driverOid,
      driver_name,
      planned_date:           new Date(dto.planned_date),
      origin:                 dto.origin,
      destination:            dto.destination,
      waypoints:              dto.waypoints ?? [],
      estimated_distance_km:  Number(dto.estimated_distance_km) || 0,
      estimated_duration_min: Number(dto.estimated_duration_min) || 0,
      notes:                  dto.notes ?? '',
      status:                 dto.status ?? 'planned',
      owner:                  this.oid(ownerId),
    });
  }

  async findAll(ownerId: string, filters: FindAllFilters) {
    const q: any = { owner: this.oid(ownerId) };
    if (filters.status    && filters.status !== 'all')  q.status  = filters.status;
    if (filters.vehicleId && Types.ObjectId.isValid(filters.vehicleId)) {
      q.vehicle = this.oid(filters.vehicleId);
    }
    if (filters.startDate || filters.endDate) {
      q.planned_date = {};
      if (filters.startDate) q.planned_date.$gte = new Date(filters.startDate);
      if (filters.endDate)   q.planned_date.$lte = new Date(filters.endDate);
    }

    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.planModel.find(q).sort({ planned_date: -1 }).skip(skip).limit(limit).lean(),
      this.planModel.countDocuments(q),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getStats(ownerId: string) {
    const owner = this.oid(ownerId);
    const now   = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000);
    const weekEnd    = new Date(todayStart.getTime() + 7 * 86_400_000);

    const [today, thisWeek, active, byStatus] = await Promise.all([
      this.planModel.countDocuments({
        owner,
        planned_date: { $gte: todayStart, $lt: todayEnd },
        status: { $in: ['planned', 'in-progress'] },
      }),
      this.planModel.countDocuments({
        owner,
        planned_date: { $gte: todayStart, $lt: weekEnd },
        status: { $in: ['planned', 'in-progress'] },
      }),
      this.planModel.countDocuments({ owner, status: 'in-progress' }),
      this.planModel.aggregate([
        { $match: { owner } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap  = Object.fromEntries(byStatus.map((s: any) => [s._id as string, s.count as number]));
    const total      = (Object.values(statusMap) as number[]).reduce((a, b) => a + b, 0);
    const completed  = (statusMap['completed'] as number) ?? 0;
    const completion = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { today, thisWeek, active, completion, byStatus: statusMap, total };
  }

  async update(id: string, ownerId: string, dto: any) {
    const plan = await this.planModel.findOne({
      _id: this.oid(id), owner: this.oid(ownerId),
    });
    if (!plan) throw new NotFoundException('Route plan not found');

    if (dto.vehicleId && String(plan.vehicle) !== dto.vehicleId) {
      const v = await this.vehicleModel.findOne({ _id: this.oid(dto.vehicleId), owner: this.oid(ownerId) });
      if (!v) throw new NotFoundException('Vehicle not found');
      plan.vehicle      = v._id as Types.ObjectId;
      plan.vehicle_name = v.vehicle_name;
      plan.plate_number = v.plate_number;
    }

    if (dto.driverId !== undefined) {
      if (dto.driverId) {
        const d = await this.driverModel.findOne({ _id: this.oid(dto.driverId), owner: this.oid(ownerId) });
        plan.driver      = d ? d._id as Types.ObjectId : null;
        plan.driver_name = d?.name ?? '';
      } else {
        plan.driver = null; plan.driver_name = '';
      }
    }

    const fields = ['name','origin','destination','notes'] as const;
    for (const f of fields) { if (dto[f] != null) (plan as any)[f] = dto[f]; }

    if (dto.waypoints != null)              plan.waypoints              = dto.waypoints;
    if (dto.planned_date)                   plan.planned_date           = new Date(dto.planned_date);
    if (dto.estimated_distance_km != null)  plan.estimated_distance_km  = Number(dto.estimated_distance_km);
    if (dto.estimated_duration_min != null) plan.estimated_duration_min = Number(dto.estimated_duration_min);

    if (dto.status != null) {
      plan.status = dto.status as RoutePlanStatus;
      if (dto.status === 'completed' && !plan.completed_at) plan.completed_at = new Date();
      if (dto.status !== 'completed') plan.completed_at = null;
    }

    return plan.save();
  }

  async remove(id: string, ownerId: string) {
    const r = await this.planModel.deleteOne({ _id: this.oid(id), owner: this.oid(ownerId) });
    if (r.deletedCount === 0) throw new NotFoundException('Route plan not found');
  }
}
