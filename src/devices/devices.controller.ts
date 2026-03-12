import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post() @ApiOperation({ summary: 'Register device' })
  create(@Body() dto: CreateDeviceDto, @CurrentUser() user: any) {
    return this.devicesService.create(dto, user.userId);
  }

  @Get() @ApiOperation({ summary: 'Get all devices' })
  findAll(@CurrentUser() user: any, @Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.devicesService.findAll(user.userId, page || 1, limit || 10, search);
  }

  @Get(':id') @ApiOperation({ summary: 'Get device by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.devicesService.findById(id, user.userId);
  }

  @Put(':id') @ApiOperation({ summary: 'Update device' })
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto, @CurrentUser() user: any) {
    return this.devicesService.update(id, dto, user.userId);
  }

  @Delete(':id') @ApiOperation({ summary: 'Delete device' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.devicesService.remove(id, user.userId);
  }

  @Get('/all')
  @ApiOperation({ summary: 'Get all devices (no filter)' })
  findAllDevices() {
    return this.devicesService.findAllDevices();
  }

  @Delete('/imei/:imei')
  @ApiOperation({ summary: 'Delete device by IMEI' })
  removeByImei(@Param('imei') imei: string) {
    return this.devicesService.removeByImei(imei);
  }
}
