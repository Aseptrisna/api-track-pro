import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device } from './schemas/device.schema';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(@InjectModel(Device.name) private deviceModel: Model<Device>) {}

  async create(dto: CreateDeviceDto): Promise<Device> { return this.deviceModel.create(dto); }

  async findAll(page = 1, limit = 10, search?: string) {
    const filter: any = {};
    if (search) filter.$or = [{ imei: { $regex: search, $options: 'i' } }, { device_name: { $regex: search, $options: 'i' } }];
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.deviceModel.find(filter).populate('vehicle_id').skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.deviceModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Device> {
    const d = await this.deviceModel.findById(id).populate('vehicle_id');
    if (!d) throw new NotFoundException('Device not found');
    return d;
  }

  async findByImei(imei: string): Promise<Device | null> {
    return this.deviceModel.findOne({ imei }).populate('vehicle_id');
  }

  async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
    const d = await this.deviceModel.findByIdAndUpdate(id, dto, { new: true });
    if (!d) throw new NotFoundException('Device not found');
    return d;
  }

  async remove(id: string): Promise<void> {
    const r = await this.deviceModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException('Device not found');
  }

  async updateStatus(imei: string, status: string): Promise<void> {
    await this.deviceModel.findOneAndUpdate({ imei }, { status, last_seen: new Date() });
  }

  async countOnline(): Promise<number> {
    return this.deviceModel.countDocuments({ status: 'online' });
  }
}
