import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FuelLogsService } from './fuel-logs.service';
import { CreateFuelLogDto } from './dto/create-fuel-log.dto';
import { UpdateFuelLogDto } from './dto/update-fuel-log.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Fuel Logs')
@ApiBearerAuth()
@Controller('fuel-logs')
export class FuelLogsController {
  constructor(private readonly fuelLogsService: FuelLogsService) {}

  @Post()
  @ApiOperation({ summary: 'Add fuel log entry' })
  create(@Body() dto: CreateFuelLogDto, @CurrentUser() user: any) {
    return this.fuelLogsService.create(dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get fuel logs for current user' })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'page',      required: false })
  @ApiQuery({ name: 'limit',     required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('vehicleId') vehicleId?: string,
    @Query('page')      page?: number,
    @Query('limit')     limit?: number,
  ) {
    return this.fuelLogsService.findAll({
      userId:    user.userId,
      vehicleId,
      page:  page  ? +page  : 1,
      limit: limit ? +limit : 20,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get fuel statistics' })
  @ApiQuery({ name: 'vehicleId', required: false })
  getStats(@CurrentUser() user: any, @Query('vehicleId') vehicleId?: string) {
    return this.fuelLogsService.getStats(user.userId, vehicleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fuel log by ID' })
  findOne(@Param('id') id: string) {
    return this.fuelLogsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update fuel log' })
  update(@Param('id') id: string, @Body() dto: UpdateFuelLogDto) {
    return this.fuelLogsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete fuel log' })
  remove(@Param('id') id: string) {
    return this.fuelLogsService.remove(id);
  }
}
