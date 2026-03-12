import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Device } from './schemas/device.schema';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(@InjectModel(Device.name) private deviceModel: Model<Device>) {}

  async create(dto: CreateDeviceDto, ownerId: string): Promise<Device> {
    return this.deviceModel.create({ ...dto, owner: new Types.ObjectId(ownerId) });
  }

  async findAll(ownerId: string, page = 1, limit = 10, search?: string) {
    const filter: any = { owner: new Types.ObjectId(ownerId) };
    if (search) filter.$or = [{ imei: { $regex: search, $options: 'i' } }, { device_name: { $regex: search, $options: 'i' } }];
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.deviceModel.find(filter).populate('vehicle_id').skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.deviceModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ownerId: string): Promise<Device> {
    const d = await this.deviceModel.findOne({ _id: id, owner: new Types.ObjectId(ownerId) }).populate('vehicle_id');
    if (!d) throw new NotFoundException('Device not found');
    return d;
  }

  async findByImei(imei: string): Promise<Device | null> {
    return this.deviceModel.findOne({ imei }).populate('vehicle_id');
  }

  async update(id: string, dto: UpdateDeviceDto, ownerId: string): Promise<Device> {
    const d = await this.deviceModel.findOneAndUpdate({ _id: id, owner: new Types.ObjectId(ownerId) }, dto, { new: true });
    if (!d) throw new NotFoundException('Device not found');
    return d;
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const r = await this.deviceModel.findOneAndDelete({ _id: id, owner: new Types.ObjectId(ownerId) });
    if (!r) throw new NotFoundException('Device not found');
  }

  async updateStatus(imei: string, status: string): Promise<void> {
    await this.deviceModel.findOneAndUpdate({ imei }, { status, last_seen: new Date() });
  }

  async countOnline(): Promise<number> {
    return this.deviceModel.countDocuments({ status: 'online' });
  }

  async countOnlineByOwner(ownerId: string): Promise<number> {
    return this.deviceModel.countDocuments({ owner: new Types.ObjectId(ownerId), status: 'online' });
  }
}
