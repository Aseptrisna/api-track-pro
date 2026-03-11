import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shipment } from './schemas/shipment.schema';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Injectable()
export class ShipmentsService {
  constructor(@InjectModel(Shipment.name) private shipmentModel: Model<Shipment>) {}

  async create(dto: CreateShipmentDto): Promise<Shipment> { return this.shipmentModel.create(dto); }

  async findAll(page = 1, limit = 10, search?: string, status?: string) {
    const filter: any = {};
    if (search) filter.$or = [{ shipment_code: { $regex: search, $options: 'i' } }, { origin: { $regex: search, $options: 'i' } }, { destination: { $regex: search, $options: 'i' } }];
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.shipmentModel.find(filter).populate('vehicle').populate('driver').skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.shipmentModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Shipment> {
    const s = await this.shipmentModel.findById(id).populate('vehicle').populate('driver');
    if (!s) throw new NotFoundException('Shipment not found');
    return s;
  }

  async update(id: string, dto: UpdateShipmentDto): Promise<Shipment> {
    const s = await this.shipmentModel.findByIdAndUpdate(id, dto, { new: true });
    if (!s) throw new NotFoundException('Shipment not found');
    return s;
  }

  async remove(id: string): Promise<void> {
    const r = await this.shipmentModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException('Shipment not found');
  }

  async countByStatus(status: string): Promise<number> { return this.shipmentModel.countDocuments({ status }); }

  async countToday(): Promise<number> {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return this.shipmentModel.countDocuments({ status: 'delivered', arrival_time: { $gte: start, $lte: end } });
  }
}
