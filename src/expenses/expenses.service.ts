import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense } from './schemas/expense.schema';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';

interface FindAllFilters {
  vehicleId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name) private expenseModel: Model<Expense>,
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
  ) {}

  // ── helpers ──────────────────────────────────────────────────────────────────
  private async resolveVehicle(vehicleId: string, ownerId: string) {
    const v = await this.vehicleModel.findOne({
      _id: new Types.ObjectId(vehicleId),
      owner: new Types.ObjectId(ownerId),
    });
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  async create(ownerId: string, dto: any) {
    const v = await this.resolveVehicle(dto.vehicleId, ownerId);
    return this.expenseModel.create({
      vehicle:      v._id,
      vehicle_name: v.vehicle_name,
      plate_number: v.plate_number,
      category:     dto.category,
      amount:       Number(dto.amount),
      date:         new Date(dto.date),
      description:  dto.description ?? '',
      owner:        new Types.ObjectId(ownerId),
    });
  }

  async findAll(ownerId: string, filters: FindAllFilters) {
    const q: any = { owner: new Types.ObjectId(ownerId) };

    if (filters.vehicleId && Types.ObjectId.isValid(filters.vehicleId)) {
      q.vehicle = new Types.ObjectId(filters.vehicleId);
    }
    if (filters.category) q.category = filters.category;
    if (filters.startDate || filters.endDate) {
      q.date = {};
      if (filters.startDate) q.date.$gte = new Date(filters.startDate);
      if (filters.endDate)   q.date.$lte = new Date(filters.endDate);
    }

    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.expenseModel.find(q).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      this.expenseModel.countDocuments(q),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getStats(ownerId: string) {
    const owner = new Types.ObjectId(ownerId);
    const now   = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear  = new Date(now.getFullYear(), 0, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [monthly, yearly, byCategory, trend] = await Promise.all([
      this.expenseModel.aggregate([
        { $match: { owner, date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.expenseModel.aggregate([
        { $match: { owner, date: { $gte: startOfYear } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.expenseModel.aggregate([
        { $match: { owner, date: { $gte: startOfYear } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      this.expenseModel.aggregate([
        { $match: { owner, date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    return {
      thisMonth:      monthly[0]?.total ?? 0,
      thisMonthCount: monthly[0]?.count ?? 0,
      thisYear:       yearly[0]?.total  ?? 0,
      thisYearCount:  yearly[0]?.count  ?? 0,
      byCategory:     byCategory.map((c: any) => ({ category: c._id, total: c.total, count: c.count })),
      trend:          trend.map((t: any) => ({
        month: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
        total: t.total,
      })),
    };
  }

  async update(id: string, ownerId: string, dto: any) {
    const expense = await this.expenseModel.findOne({
      _id: new Types.ObjectId(id),
      owner: new Types.ObjectId(ownerId),
    });
    if (!expense) throw new NotFoundException('Expense not found');

    if (dto.vehicleId && String(expense.vehicle) !== dto.vehicleId) {
      const v = await this.resolveVehicle(dto.vehicleId, ownerId);
      expense.vehicle      = v._id as Types.ObjectId;
      expense.vehicle_name = v.vehicle_name;
      expense.plate_number = v.plate_number;
    }

    if (dto.category)         expense.category    = dto.category;
    if (dto.amount != null)   expense.amount      = Number(dto.amount);
    if (dto.date)             expense.date        = new Date(dto.date);
    if (dto.description != null) expense.description = dto.description;

    return expense.save();
  }

  async remove(id: string, ownerId: string) {
    const r = await this.expenseModel.deleteOne({
      _id: new Types.ObjectId(id),
      owner: new Types.ObjectId(ownerId),
    });
    if (r.deletedCount === 0) throw new NotFoundException('Expense not found');
  }
}
