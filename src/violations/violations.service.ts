import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Violation } from './schemas/violation.schema';

export interface LogViolationDto {
  vehicle?: string;
  imei: string;
  timestamp: Date;
  speed: number;
  speed_limit: number;
  latitude?: number;
  longitude?: number;
  owner: string;
}

@Injectable()
export class ViolationsService {
  constructor(
    @InjectModel(Violation.name) private readonly violationModel: Model<Violation>,
  ) {}

  async log(data: LogViolationDto): Promise<void> {
    const excess = Math.round(data.speed - data.speed_limit);
    const severity = excess >= 40 ? 'severe' : excess >= 20 ? 'moderate' : 'mild';

    await this.violationModel
      .create({
        vehicle: data.vehicle ? new Types.ObjectId(data.vehicle) : undefined,
        imei: data.imei,
        timestamp: data.timestamp,
        speed: Math.round(data.speed),
        speed_limit: data.speed_limit,
        excess,
        severity,
        latitude: data.latitude,
        longitude: data.longitude,
        owner: new Types.ObjectId(data.owner),
      })
      .catch(() => null);
  }

  async findAll(
    ownerId: string,
    options: {
      vehicleId?: string;
      severity?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { vehicleId, severity, from, to, page = 1, limit = 20 } = options;

    const match: any = { owner: new Types.ObjectId(ownerId) };
    if (vehicleId) match.vehicle = new Types.ObjectId(vehicleId);
    if (severity) match.severity = severity;
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }

    const [result] = await this.violationModel.aggregate([
      { $match: match },
      {
        $facet: {
          data: [
            { $sort: { timestamp: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: 'vehicles',
                localField: 'vehicle',
                foreignField: '_id',
                as: 'vehicle_doc',
              },
            },
            {
              $addFields: {
                vehicle_info: { $arrayElemAt: ['$vehicle_doc', 0] },
              },
            },
            { $project: { vehicle_doc: 0 } },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const total = result.total[0]?.count ?? 0;
    return {
      data: result.data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getStats(
    ownerId: string,
    options: { vehicleId?: string; days?: number } = {},
  ) {
    const { vehicleId, days = 30 } = options;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const match: any = {
      owner: new Types.ObjectId(ownerId),
      timestamp: { $gte: fromDate },
    };
    if (vehicleId) match.vehicle = new Types.ObjectId(vehicleId);

    const [summary, trend, byVehicle, bySeverityArr] = await Promise.all([
      this.violationModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgExcess: { $avg: '$excess' },
            maxSpeed: { $max: '$speed' },
            severe: { $sum: { $cond: [{ $eq: ['$severity', 'severe'] }, 1, 0] } },
            moderate: { $sum: { $cond: [{ $eq: ['$severity', 'moderate'] }, 1, 0] } },
            mild: { $sum: { $cond: [{ $eq: ['$severity', 'mild'] }, 1, 0] } },
          },
        },
      ]),

      this.violationModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            total: { $sum: 1 },
            mild: { $sum: { $cond: [{ $eq: ['$severity', 'mild'] }, 1, 0] } },
            moderate: { $sum: { $cond: [{ $eq: ['$severity', 'moderate'] }, 1, 0] } },
            severe: { $sum: { $cond: [{ $eq: ['$severity', 'severe'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', total: 1, mild: 1, moderate: 1, severe: 1 } },
      ]),

      this.violationModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$vehicle',
            count: { $sum: 1 },
            avgExcess: { $avg: '$excess' },
            severe: { $sum: { $cond: [{ $eq: ['$severity', 'severe'] }, 1, 0] } },
            moderate: { $sum: { $cond: [{ $eq: ['$severity', 'moderate'] }, 1, 0] } },
            mild: { $sum: { $cond: [{ $eq: ['$severity', 'mild'] }, 1, 0] } },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'vehicles',
            localField: '_id',
            foreignField: '_id',
            as: 'vehicle_doc',
          },
        },
        {
          $addFields: { vehicle_info: { $arrayElemAt: ['$vehicle_doc', 0] } },
        },
        { $project: { vehicle_doc: 0 } },
      ]),

      this.violationModel.aggregate([
        { $match: match },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
    ]);

    // Fill in missing days
    const trendMap = new Map(trend.map((t: any) => [t.date, t]));
    const fullTrend: { date: string; total: number; mild: number; moderate: number; severe: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = trendMap.get(key) as any;
      fullTrend.push({
        date: key,
        total: entry?.total ?? 0,
        mild: entry?.mild ?? 0,
        moderate: entry?.moderate ?? 0,
        severe: entry?.severe ?? 0,
      });
    }

    const bySeverity: Record<string, number> = {};
    for (const item of bySeverityArr) {
      bySeverity[item._id] = item.count;
    }

    return {
      summary: summary[0] ?? {
        total: 0,
        avgExcess: 0,
        maxSpeed: 0,
        severe: 0,
        moderate: 0,
        mild: 0,
      },
      trend: fullTrend,
      byVehicle,
      bySeverity,
    };
  }
}
