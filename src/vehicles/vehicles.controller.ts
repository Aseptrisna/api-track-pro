import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityLogService } from '../activity-log/activity-log.service';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create vehicle' })
  async create(@Body() dto: CreateVehicleDto, @CurrentUser() user: any) {
    const vehicle = await this.vehiclesService.create(dto, user.userId);
    this.activityLogService.log(
      user.userId, 'created', 'Vehicles',
      `Added vehicle "${dto.vehicle_name}" (${dto.plate_number})`,
    );
    return vehicle;
  }

  @Get()
  @ApiOperation({ summary: 'Get all vehicles for current user' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false }) @ApiQuery({ name: 'type', required: false })
  findAll(@CurrentUser() user: any, @Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string, @Query('type') type?: string) {
    return this.vehiclesService.findAll(user.userId, page || 1, limit || 10, search, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.vehiclesService.findById(id, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vehicle' })
  async update(@Param('id') id: string, @Body() dto: UpdateVehicleDto, @CurrentUser() user: any) {
    const vehicle = await this.vehiclesService.update(id, dto, user.userId);
    this.activityLogService.log(
      user.userId, 'updated', 'Vehicles',
      `Updated vehicle "${vehicle.vehicle_name}" (${vehicle.plate_number})`,
    );
    return vehicle;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vehicle' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.vehiclesService.remove(id, user.userId);
    this.activityLogService.log(
      user.userId, 'deleted', 'Vehicles',
      `Deleted vehicle ID: ${id}`,
    );
  }
}
