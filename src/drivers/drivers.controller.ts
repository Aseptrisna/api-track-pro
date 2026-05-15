import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityLogService } from '../activity-log/activity-log.service';

@ApiTags('Drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post() @ApiOperation({ summary: 'Add driver' })
  async create(@Body() dto: CreateDriverDto, @CurrentUser() user: any) {
    const driver = await this.driversService.create(dto);
    this.activityLogService.log(
      user.userId, 'created', 'Drivers',
      `Added driver "${dto.name}" (${dto.license_number})`,
    );
    return driver;
  }

  @Get() @ApiOperation({ summary: 'Get all drivers' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.driversService.findAll(page || 1, limit || 10, search);
  }

  @Get(':id') @ApiOperation({ summary: 'Get driver by ID' })
  findOne(@Param('id') id: string) { return this.driversService.findById(id); }

  @Put(':id') @ApiOperation({ summary: 'Update driver' })
  async update(@Param('id') id: string, @Body() dto: UpdateDriverDto, @CurrentUser() user: any) {
    const driver = await this.driversService.update(id, dto);
    this.activityLogService.log(
      user.userId, 'updated', 'Drivers',
      `Updated driver "${driver.name}"`,
    );
    return driver;
  }

  @Delete(':id') @ApiOperation({ summary: 'Delete driver' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.driversService.remove(id);
    this.activityLogService.log(
      user.userId, 'deleted', 'Drivers',
      `Deleted driver ID: ${id}`,
    );
  }
}
