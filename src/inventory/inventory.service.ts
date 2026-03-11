import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inventory } from './schemas/inventory.schema';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(@InjectModel(Inventory.name) private inventoryModel: Model<Inventory>) {}

  async create(dto: CreateInventoryDto): Promise<Inventory> { return this.inventoryModel.create(dto); }

  async findAll(page = 1, limit = 10, search?: string) {
    const filter: any = {};
    if (search) filter.warehouse = { $regex: search, $options: 'i' };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.inventoryModel.find(filter).populate('product').skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.inventoryModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Inventory> {
    const i = await this.inventoryModel.findById(id).populate('product');
    if (!i) throw new NotFoundException('Inventory not found');
    return i;
  }

  async update(id: string, dto: UpdateInventoryDto): Promise<Inventory> {
    const i = await this.inventoryModel.findByIdAndUpdate(id, dto, { new: true });
    if (!i) throw new NotFoundException('Inventory not found');
    return i;
  }

  async remove(id: string): Promise<void> {
    const r = await this.inventoryModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException('Inventory not found');
  }

  async getLowStock(): Promise<Inventory[]> {
    return this.inventoryModel.find({ $expr: { $lte: ['$stock', '$minimum_stock'] } }).populate('product').exec();
  }
}
