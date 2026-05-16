import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IdleLog } from './schemas/idle-log.schema';

export interface LogIdleDto {
  vehicle_id:       string | null;
  imei:             string;
  start_time:       Date;
  end_time:         Date;
  duration_minutes: number;
  latitude:         number;
  longitude:        number;
  owner:            string;
}

@Injectable()
export class IdleLogsService {
  constructor(
    @InjectModel(IdleLog.name) private readonly model: Model<IdleLog>,
  ) {}

  async log(dto: LogIdleDto): Promise<void> {
    await this.model.create({
      vehicle_id:       dto.vehicle_id ? new Types.ObjectId(dto.vehicle_id) : null,
      imei:             dto.imei,
      start_time:       dto.start_time,
      end_time:         dto.end_time,
      duration_minutes: dto.duration_minutes,
      latitude:         dto.latitude,
      longitude:        dto.longitude,
      owner:            new Types.ObjectId(dto.owner),
    });
  }

  async findAll(
    ownerId:    string,
    vehicleId?: string,
    startDate?: string,
    endDate?:   string,
    page  = 1,
    limit = 20,
  ) {
    const filter: any = { owner: new Types.ObjectId(ownerId) };
    if (vehicleId) filter.vehicle_id = new Types.ObjectId(vehicleId);
    if (startDate || endDate) {
      filter.start_time = {};
      if (startDate) filter.start_time.$gte = new Date(startDate);
      if (endDate)   filter.start_time.$lte = new Date(endDate);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ start_time: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStats(ownerId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const ownerOid = new Types.ObjectId(ownerId);

    const [perVehicle, totals] = await Promise.all([
      // Per-vehicle aggregation
      this.model.aggregate([
        { $match: { owner: ownerOid, start_time: { $gte: since } } },
        {
          $group: {
            _id:              '$vehicle_id',
            totalEvents:      { $sum: 1 },
            totalMinutes:     { $sum: '$duration_minutes' },
            avgDuration:      { $avg: '$duration_minutes' },
            maxDuration:      { $max: '$duration_minutes' },
            lastIdle:         { $max: '$start_time' },
          },
        },
        { $sort: { totalMinutes: -1 } },
      ]),
      // Fleet totals
      this.model.aggregate([
        { $match: { owner: ownerOid, start_time: { $gte: since } } },
        {
          $group: {
            _id:          null,
            totalEvents:  { $sum: 1 },
            totalMinutes: { $sum: '$duration_minutes' },
            avgDuration:  { $avg: '$duration_minutes' },
          },
        },
      ]),
    ]);

    return {
      summary: totals[0] ?? { totalEvents: 0, totalMinutes: 0, avgDuration: 0 },
      perVehicle,
    };
  }
}
