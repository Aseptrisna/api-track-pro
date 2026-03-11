import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Driver } from './schemas/driver.schema';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(@InjectModel(Driver.name) private driverModel: Model<Driver>) {}

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
}
