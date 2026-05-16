import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Driver } from './schemas/driver.schema';
import { Violation } from '../violations/schemas/violation.schema';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<Driver>,
    @InjectModel(Violation.name) private violationModel: Model<Violation>,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async create(dto: CreateDriverDto): Promise<Driver> { return this.driverModel.create(dto); }

  async findAll(page = 1, limit = 10, search?: string) {
    const filter: any = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.driverModel.find(filter).populate('assigned_vehicle').skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.driverModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Driver> {
    const d = await this.driverModel.findById(id).populate('assigned_vehicle');
    if (!d) throw new NotFoundException('Driver not found');
    return d;
  }

  async update(id: string, dto: UpdateDriverDto): Promise<Driver> {
    const d = await this.driverModel.findByIdAndUpdate(id, dto, { new: true });
    if (!d) throw new NotFoundException('Driver not found');
    return d;
  }

  async remove(id: string): Promise<void> {
    const r = await this.driverModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException('Driver not found');
  }

  async getPerformance(ownerId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get all vehicles owned by this user that have a driver assigned
    const vehicles = (await this.vehiclesService.getAllByOwner(ownerId)).filter(
      (v: any) => v.driver && typeof v.driver === 'object',
    ) as any[];

    if (!vehicles.length) return [];

    const vehicleIds = vehicles.map((v) => v._id);

    // Aggregate violation counts per vehicle in the period
    const counts = await this.violationModel.aggregate([
      {
        $match: {
          vehicle: { $in: vehicleIds.map((id) => new Types.ObjectId(String(id))) },
          owner: new Types.ObjectId(ownerId),
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: '$vehicle',
          severe:   { $sum: { $cond: [{ $eq: ['$severity', 'severe']   }, 1, 0] } },
          moderate: { $sum: { $cond: [{ $eq: ['$severity', 'moderate'] }, 1, 0] } },
          mild:     { $sum: { $cond: [{ $eq: ['$severity', 'mild']     }, 1, 0] } },
        },
      },
    ]);

    const countMap = new Map(counts.map((c) => [c._id.toString(), c]));

    const results = vehicles.map((v) => {
      const driver = v.driver as any;
      const c = countMap.get(v._id.toString()) ?? { severe: 0, moderate: 0, mild: 0 };

      // Score: start 100, deduct by severity (each capped to prevent single metric dominating)
      const deduction =
        Math.min(c.severe * 10, 40) +
        Math.min(c.moderate * 5,  20) +
        Math.min(c.mild * 2,      10);
      const score = Math.max(0, 100 - deduction);

      return {
        driver_id:     driver?._id   ?? null,
        driver_name:   driver?.name  ?? '—',
        driver_phone:  driver?.phone ?? null,
        driver_status: driver?.status ?? null,
        vehicle_id:    v._id,
        vehicle_name:  v.vehicle_name,
        vehicle_plate: v.plate_number,
        violations: {
          severe:   c.severe,
          moderate: c.moderate,
          mild:     c.mild,
          total:    c.severe + c.moderate + c.mild,
        },
        score,
        grade:
          score >= 90 ? 'excellent' :
          score >= 70 ? 'good'      :
          score >= 50 ? 'fair'      : 'poor',
        period_days: days,
      };
    });

    return results.sort((a, b) => b.score - a.score);
  }
}
