import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post() @ApiOperation({ summary: 'Create product' }) create(@Body() dto: CreateProductDto) { return this.productsService.create(dto); }
  @Get() @ApiOperation({ summary: 'Get all products' }) findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.productsService.findAll(page || 1, limit || 10, search); }
  @Get(':id') @ApiOperation({ summary: 'Get product' }) findOne(@Param('id') id: string) { return this.productsService.findById(id); }
  @Put(':id') @ApiOperation({ summary: 'Update product' }) update(@Param('id') id: string, @Body() dto: UpdateProductDto) { return this.productsService.update(id, dto); }
  @Delete(':id') @ApiOperation({ summary: 'Delete product' }) remove(@Param('id') id: string) { return this.productsService.remove(id); }
}
