import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Distribution } from './schemas/distribution.schema';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionDto } from './dto/update-distribution.dto';

@Injectable()
export class DistributionService {
  constructor(@InjectModel(Distribution.name) private distributionModel: Model<Distribution>) {}

  async create(dto: CreateDistributionDto): Promise<Distribution> { return this.distributionModel.create(dto); }

  async findAll(page = 1, limit = 10, status?: string) {
    const filter: any = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.distributionModel.find(filter).populate('product').skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.distributionModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Distribution> {
    const d = await this.distributionModel.findById(id).populate('product');
    if (!d) throw new NotFoundException('Distribution not found');
    return d;
  }

  async update(id: string, dto: UpdateDistributionDto): Promise<Distribution> {
    const d = await this.distributionModel.findByIdAndUpdate(id, dto, { new: true });
    if (!d) throw new NotFoundException('Distribution not found');
    return d;
  }

  async remove(id: string): Promise<void> {
    const r = await this.distributionModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException('Distribution not found');
  }
}
