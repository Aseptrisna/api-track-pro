import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MaintenanceRecord } from './schemas/maintenance-record.schema';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectModel(MaintenanceRecord.name)
    private maintenanceModel: Model<MaintenanceRecord>,
    @InjectModel('Vehicle')
    private vehicleModel: Model<any>,
  ) {}

  async create(dto: CreateMaintenanceRecordDto, userId: string): Promise<MaintenanceRecord> {
    const record = await this.maintenanceModel.create({
      ...dto,
      vehicle:    new Types.ObjectId(dto.vehicle),
      created_by: new Types.ObjectId(userId),
    });

    // ── Auto-update vehicle's last_service fields ─────────────────────────────
    const update: any = {
      last_service_date: new Date(dto.date),
    };
    if (dto.odometer_at_service != null) {
      update.last_service_km = dto.odometer_at_service;
    }
    await this.vehicleModel.findByIdAndUpdate(dto.vehicle, update).catch(() => {});

    return record;
  }

  async findAll(options: {
    userId: string;
    vehicleId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, vehicleId, type, page = 1, limit = 20 } = options;

    const matchStage: any = { 'vehicle_doc.owner': new Types.ObjectId(userId) };
    if (vehicleId) matchStage['vehicle'] = new Types.ObjectId(vehicleId);
    if (type) matchStage['type'] = type;

    const skip = (page - 1) * limit;

    const [result] = await this.maintenanceModel.aggregate([
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
                date: 1, type: 1, description: 1,
                cost: 1, workshop: 1, odometer_at_service: 1, notes: 1, createdAt: 1,
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

  async findById(id: string): Promise<MaintenanceRecord> {
    const r = await this.maintenanceModel.findById(id).populate('vehicle');
    if (!r) throw new NotFoundException('Maintenance record not found');
    return r;
  }

  async update(id: string, dto: UpdateMaintenanceRecordDto): Promise<MaintenanceRecord> {
    const r = await this.maintenanceModel.findByIdAndUpdate(id, dto, { new: true });
    if (!r) throw new NotFoundException('Maintenance record not found');
    return r;
  }

  async remove(id: string): Promise<void> {
    const r = await this.maintenanceModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException('Maintenance record not found');
  }

  async getStats(userId: string, vehicleId?: string) {
    const matchStage: any = { 'vehicle_doc.owner': new Types.ObjectId(userId) };
    if (vehicleId) matchStage['vehicle'] = new Types.ObjectId(vehicleId);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [summary, monthlyTrend, byType, byVehicle] = await Promise.all([
      // Overall totals
      this.maintenanceModel.aggregate([
        { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle_doc' } },
        { $unwind: '$vehicle_doc' },
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalCost:    { $sum: '$cost' },
            totalRecords: { $sum: 1 },
            avgCost:      { $avg: '$cost' },
          },
        },
      ]),

      // Monthly cost trend
      this.maintenanceModel.aggregate([
        { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle_doc' } },
        { $unwind: '$vehicle_doc' },
        { $match: { ...matchStage, date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            totalCost: { $sum: '$cost' },
            count:     { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', totalCost: 1, count: 1, _id: 0 } },
      ]),

      // By type breakdown
      this.maintenanceModel.aggregate([
        { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle_doc' } },
        { $unwind: '$vehicle_doc' },
        { $match: matchStage },
        {
          $group: {
            _id: '$type',
            totalCost: { $sum: '$cost' },
            count:     { $sum: 1 },
          },
        },
        { $sort: { totalCost: -1 } },
        { $project: { type: '$_id', totalCost: 1, count: 1, _id: 0 } },
      ]),

      // By vehicle
      this.maintenanceModel.aggregate([
        { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle_doc' } },
        { $unwind: '$vehicle_doc' },
        { $match: matchStage },
        {
          $group: {
            _id:         '$vehicle',
            vehicleName: { $first: '$vehicle_doc.vehicle_name' },
            plateNumber: { $first: '$vehicle_doc.plate_number' },
            totalCost:   { $sum: '$cost' },
            count:       { $sum: 1 },
            lastDate:    { $max: '$date' },
          },
        },
        { $sort: { totalCost: -1 } },
        { $limit: 10 },
        { $project: { vehicleName: 1, plateNumber: 1, totalCost: 1, count: 1, lastDate: 1, _id: 0 } },
      ]),
    ]);

    const s = summary[0] ?? { totalCost: 0, totalRecords: 0, avgCost: 0 };

    return {
      totalCost:    Math.round(s.totalCost),
      totalRecords: s.totalRecords,
      avgCost:      Math.round(s.avgCost ?? 0),
      monthlyTrend,
      byType,
      byVehicle,
    };
  }
}
