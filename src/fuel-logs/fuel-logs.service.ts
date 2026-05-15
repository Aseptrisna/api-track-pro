import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FuelLog } from './schemas/fuel-log.schema';
import { CreateFuelLogDto } from './dto/create-fuel-log.dto';
import { UpdateFuelLogDto } from './dto/update-fuel-log.dto';

@Injectable()
export class FuelLogsService {
  constructor(@InjectModel(FuelLog.name) private fuelLogModel: Model<FuelLog>) {}

  async create(dto: CreateFuelLogDto, userId: string): Promise<FuelLog> {
    return this.fuelLogModel.create({
      ...dto,
      vehicle:    new Types.ObjectId(dto.vehicle),
      created_by: new Types.ObjectId(userId),
    });
  }

  async findAll(options: {
    userId: string;
    vehicleId?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, vehicleId, page = 1, limit = 20 } = options;

    // Scope to vehicles owned by this user via lookup
    const matchStage: any = { 'vehicle_doc.owner': new Types.ObjectId(userId) };
    if (vehicleId) matchStage['vehicle'] = new Types.ObjectId(vehicleId);

    const skip = (page - 1) * limit;

    const [result] = await this.fuelLogModel.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicle_doc',
        },
      },
      { $unwind: '$vehicle_doc' },
      { $match: matchStage },
      { $sort: { date: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                vehicle: '$vehicle_doc',
                date: 1, liters: 1, cost_per_liter: 1,
                odometer_at_fill: 1, station_name: 1, notes: 1, createdAt: 1,
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const data  = result?.data  ?? [];
    const total = result?.total?.[0]?.count ?? 0;
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<FuelLog> {
    const log = await this.fuelLogModel.findById(id).populate('vehicle');
    if (!log) throw new NotFoundException('Fuel log not found');
    return log;
  }

  async update(id: string, dto: UpdateFuelLogDto): Promise<FuelLog> {
    const log = await this.fuelLogModel.findByIdAndUpdate(id, dto, { new: true });
    if (!log) throw new NotFoundException('Fuel log not found');
    return log;
  }

  async remove(id: string): Promise<void> {
    const r = await this.fuelLogModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException('Fuel log not found');
  }

  async getStats(userId: string, vehicleId?: string) {
    const matchStage: any = { 'vehicle_doc.owner': new Types.ObjectId(userId) };
    if (vehicleId) matchStage['vehicle'] = new Types.ObjectId(vehicleId);

    // ── Monthly cost trend (last 6 months) ──────────────────────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [summary, monthlyTrend, byVehicle] = await Promise.all([
      // Overall totals
      this.fuelLogModel.aggregate([
        { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle_doc' } },
        { $unwind: '$vehicle_doc' },
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalLiters:   { $sum: '$liters' },
            totalCost:     { $sum: { $multiply: ['$liters', '$cost_per_liter'] } },
            totalFills:    { $sum: 1 },
            avgCostPerL:   { $avg: '$cost_per_liter' },
          },
        },
      ]),

      // Monthly trend
      this.fuelLogModel.aggregate([
        { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle_doc' } },
        { $unwind: '$vehicle_doc' },
        { $match: { ...matchStage, date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            totalLiters: { $sum: '$liters' },
            totalCost:   { $sum: { $multiply: ['$liters', '$cost_per_liter'] } },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', totalLiters: 1, totalCost: 1, _id: 0 } },
      ]),

      // By vehicle breakdown
      this.fuelLogModel.aggregate([
        { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle_doc' } },
        { $unwind: '$vehicle_doc' },
        { $match: matchStage },
        {
          $group: {
            _id: '$vehicle',
            vehicleName:  { $first: '$vehicle_doc.vehicle_name' },
            plateNumber:  { $first: '$vehicle_doc.plate_number' },
            totalLiters:  { $sum: '$liters' },
            totalCost:    { $sum: { $multiply: ['$liters', '$cost_per_liter'] } },
            totalFills:   { $sum: 1 },
          },
        },
        { $sort: { totalCost: -1 } },
        { $limit: 10 },
        {
          $project: {
            vehicleName: 1, plateNumber: 1,
            totalLiters: 1, totalCost: 1, totalFills: 1, _id: 0,
          },
        },
      ]),
    ]);

    const s = summary[0] ?? { totalLiters: 0, totalCost: 0, totalFills: 0, avgCostPerL: 0 };

    return {
      totalLiters:   Math.round(s.totalLiters * 10) / 10,
      totalCost:     Math.round(s.totalCost),
      totalFills:    s.totalFills,
      avgCostPerL:   Math.round((s.avgCostPerL ?? 0) * 10) / 10,
      monthlyTrend,
      byVehicle,
    };
  }
}
