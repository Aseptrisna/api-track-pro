import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductionService } from './production.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';

@ApiTags('Production')
@ApiBearerAuth()
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post() @ApiOperation({ summary: 'Create production record' }) create(@Body() dto: CreateProductionDto) { return this.productionService.create(dto); }
  @Get() @ApiOperation({ summary: 'Get all production records' }) findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: string) { return this.productionService.findAll(page || 1, limit || 10, status); }
  @Get(':id') @ApiOperation({ summary: 'Get production record' }) findOne(@Param('id') id: string) { return this.productionService.findById(id); }
  @Put(':id') @ApiOperation({ summary: 'Update production' }) update(@Param('id') id: string, @Body() dto: UpdateProductionDto) { return this.productionService.update(id, dto); }
  @Delete(':id') @ApiOperation({ summary: 'Delete production' }) remove(@Param('id') id: string) { return this.productionService.remove(id); }
}
