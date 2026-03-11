import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { GpsDataService } from './gps-data.service';
import { CreateGpsDataDto } from './dto/create-gps-data.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('GPS Data')
@Controller('gps-data')
export class GpsDataController {
  constructor(private readonly gpsDataService: GpsDataService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Store GPS data' })
  create(@Body() dto: CreateGpsDataDto) { return this.gpsDataService.create(dto); }

  @ApiBearerAuth()
  @Get('latest')
  @ApiOperation({ summary: 'Get latest positions for current user vehicles' })
  getAllLatest(@CurrentUser() user: any) {
    return this.gpsDataService.getAllLatestByOwner(user.userId);
  }

  @ApiBearerAuth()
  @Get('latest/:imei')
  @ApiOperation({ summary: 'Get latest position by IMEI' })
  getLatest(@Param('imei') imei: string) { return this.gpsDataService.getLatestByImei(imei); }

  @ApiBearerAuth()
  @Get('history/:imei')
  @ApiOperation({ summary: 'Get GPS history' })
  getHistory(@Param('imei') imei: string, @Query('start') start: string, @Query('end') end: string) {
    return this.gpsDataService.getHistory(imei, new Date(start), new Date(end));
  }

  @ApiBearerAuth()
  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Get latest by vehicle' })
  getByVehicle(@Param('vehicleId') vehicleId: string) { return this.gpsDataService.getLatestByVehicle(vehicleId); }

  @ApiBearerAuth()
  @Get('vehicle-history/:vehicleId')
  @ApiOperation({ summary: 'Get vehicle GPS history' })
  getVehicleHistory(@Param('vehicleId') vehicleId: string, @Query('start') start: string, @Query('end') end: string) {
    return this.gpsDataService.getVehicleHistory(vehicleId, new Date(start), new Date(end));
  }
}
