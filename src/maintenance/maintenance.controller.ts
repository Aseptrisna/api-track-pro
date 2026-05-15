import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @ApiOperation({ summary: 'Add maintenance record' })
  create(@Body() dto: CreateMaintenanceRecordDto, @CurrentUser() user: any) {
    return this.maintenanceService.create(dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get maintenance records' })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'type',      required: false })
  @ApiQuery({ name: 'page',      required: false })
  @ApiQuery({ name: 'limit',     required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('vehicleId') vehicleId?: string,
    @Query('type')      type?: string,
    @Query('page')      page?: number,
    @Query('limit')     limit?: number,
  ) {
    return this.maintenanceService.findAll({
      userId:    user.userId,
      vehicleId,
      type,
      page:  page  ? +page  : 1,
      limit: limit ? +limit : 20,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get maintenance statistics' })
  @ApiQuery({ name: 'vehicleId', required: false })
  getStats(@CurrentUser() user: any, @Query('vehicleId') vehicleId?: string) {
    return this.maintenanceService.getStats(user.userId, vehicleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get record by ID' })
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update maintenance record' })
  update(@Param('id') id: string, @Body() dto: UpdateMaintenanceRecordDto) {
    return this.maintenanceService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete maintenance record' })
  remove(@Param('id') id: string) {
    return this.maintenanceService.remove(id);
  }
}
