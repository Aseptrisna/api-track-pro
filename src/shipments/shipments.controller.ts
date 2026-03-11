import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@ApiTags('Shipments')
@ApiBearerAuth()
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post() @ApiOperation({ summary: 'Create shipment' })
  create(@Body() dto: CreateShipmentDto) { return this.shipmentsService.create(dto); }

  @Get() @ApiOperation({ summary: 'Get all shipments' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string, @Query('status') status?: string) {
    return this.shipmentsService.findAll(page || 1, limit || 10, search, status);
  }

  @Get(':id') @ApiOperation({ summary: 'Get shipment by ID' })
  findOne(@Param('id') id: string) { return this.shipmentsService.findById(id); }

  @Put(':id') @ApiOperation({ summary: 'Update shipment' })
  update(@Param('id') id: string, @Body() dto: UpdateShipmentDto) { return this.shipmentsService.update(id, dto); }

  @Delete(':id') @ApiOperation({ summary: 'Delete shipment' })
  remove(@Param('id') id: string) { return this.shipmentsService.remove(id); }
}
