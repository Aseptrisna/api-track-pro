import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Production } from './schemas/production.schema';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';

@Injectable()
export class ProductionService {
  constructor(@InjectModel(Production.name) private productionModel: Model<Production>) {}

  async create(dto: CreateProductionDto): Promise<Production> { return this.productionModel.create(dto); }

  async findAll(page = 1, limit = 10, status?: string) {
    const filter: any = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.productionModel.find(filter).populate('product').skip(skip).limit(limit).sort({ production_date: -1 }).exec(),
      this.productionModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Production> {
    const p = await this.productionModel.findById(id).populate('product');
    if (!p) throw new NotFoundException('Production record not found');
    return p;
  }

  async update(id: string, dto: UpdateProductionDto): Promise<Production> {
    const p = await this.productionModel.findByIdAndUpdate(id, dto, { new: true });
    if (!p) throw new NotFoundException('Production record not found');
    return p;
  }

  async remove(id: string): Promise<void> {
    const r = await this.productionModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException('Production record not found');
  }
}
