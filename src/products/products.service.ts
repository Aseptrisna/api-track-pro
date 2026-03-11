import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<Product>) {}

  async create(dto: CreateProductDto): Promise<Product> { return this.productModel.create(dto); }

  async findAll(page = 1, limit = 10, search?: string) {
    const filter: any = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.productModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.productModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Product> {
    const p = await this.productModel.findById(id);
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const p = await this.productModel.findByIdAndUpdate(id, dto, { new: true });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async remove(id: string): Promise<void> {
    const r = await this.productModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException('Product not found');
  }
}
