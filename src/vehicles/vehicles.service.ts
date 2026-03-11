import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle } from './schemas/vehicle.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(@InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>) {}

  async create(dto: CreateVehicleDto, ownerId: string): Promise<Vehicle> {
    return this.vehicleModel.create({ ...dto, owner: ownerId });
  }

  async findAll(ownerId: string, page = 1, limit = 10, search?: string, type?: string) {
    const filter: any = { owner: ownerId };
    if (search) filter.$or = [
      { vehicle_name: { $regex: search, $options: 'i' } },
      { plate_number: { $regex: search, $options: 'i' } },
    ];
    if (type) filter.vehicle_type = type;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.vehicleModel.find(filter).populate('driver').populate('device_id').skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.vehicleModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ownerId: string): Promise<Vehicle> {
    const v = await this.vehicleModel.findOne({ _id: id, owner: ownerId }).populate('driver').populate('device_id');
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  async update(id: string, dto: UpdateVehicleDto, ownerId: string): Promise<Vehicle> {
    const v = await this.vehicleModel.findOneAndUpdate({ _id: id, owner: ownerId }, dto, { new: true });
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const r = await this.vehicleModel.findOneAndDelete({ _id: id, owner: ownerId });
    if (!r) throw new NotFoundException('Vehicle not found');
  }

  async countByOwner(ownerId: string): Promise<number> {
    return this.vehicleModel.countDocuments({ owner: ownerId });
  }

  async countByOwnerAndStatus(ownerId: string, status: string): Promise<number> {
    return this.vehicleModel.countDocuments({ owner: ownerId, status });
  }

  async getAllByOwner(ownerId: string): Promise<Vehicle[]> {
    return this.vehicleModel.find({ owner: ownerId }).populate('driver').populate('device_id').exec();
  }

  // Admin: get all vehicles across all users
  async count(): Promise<number> {
    return this.vehicleModel.countDocuments();
  }

  async countByStatus(status: string): Promise<number> {
    return this.vehicleModel.countDocuments({ status });
  }

  async getAll(): Promise<Vehicle[]> {
    return this.vehicleModel.find().populate('driver').populate('device_id').exec();
  }
}
