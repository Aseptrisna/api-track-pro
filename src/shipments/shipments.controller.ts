import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityLogService } from '../activity-log/activity-log.service';

@ApiTags('Shipments')
@ApiBearerAuth()
@Controller('shipments')
export class ShipmentsController {
  constructor(
    private readonly shipmentsService: ShipmentsService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post() @ApiOperation({ summary: 'Create shipment' })
  async create(@Body() dto: CreateShipmentDto, @CurrentUser() user: any) {
    const shipment = await this.shipmentsService.create(dto);
    this.activityLogService.log(
      user.userId, 'created', 'Shipments',
      `Created shipment ${dto.shipment_code} (${dto.origin} → ${dto.destination})`,
    );
    return shipment;
  }

  @Get() @ApiOperation({ summary: 'Get all shipments' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string, @Query('status') status?: string) {
    return this.shipmentsService.findAll(page || 1, limit || 10, search, status);
  }

  @Get(':id') @ApiOperation({ summary: 'Get shipment by ID' })
  findOne(@Param('id') id: string) { return this.shipmentsService.findById(id); }

  @Put(':id') @ApiOperation({ summary: 'Update shipment' })
  async update(@Param('id') id: string, @Body() dto: UpdateShipmentDto, @CurrentUser() user: any) {
    const shipment = await this.shipmentsService.update(id, dto, user?.userId);
    const detail = dto.status
      ? `Status changed to "${dto.status}" for shipment ${shipment.shipment_code}`
      : `Updated shipment ${shipment.shipment_code}`;
    this.activityLogService.log(user.userId, dto.status ? 'status_changed' : 'updated', 'Shipments', detail);
    return shipment;
  }

  @Delete(':id') @ApiOperation({ summary: 'Delete shipment' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.shipmentsService.remove(id);
    this.activityLogService.log(user.userId, 'deleted', 'Shipments', `Deleted shipment ID: ${id}`);
  }
}
