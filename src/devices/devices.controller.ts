import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@ApiTags('Devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post() @ApiOperation({ summary: 'Register device' })
  create(@Body() dto: CreateDeviceDto) { return this.devicesService.create(dto); }

  @Get() @ApiOperation({ summary: 'Get all devices' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.devicesService.findAll(page || 1, limit || 10, search);
  }

  @Get(':id') @ApiOperation({ summary: 'Get device by ID' })
  findOne(@Param('id') id: string) { return this.devicesService.findById(id); }

  @Put(':id') @ApiOperation({ summary: 'Update device' })
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) { return this.devicesService.update(id, dto); }

  @Delete(':id') @ApiOperation({ summary: 'Delete device' })
  remove(@Param('id') id: string) { return this.devicesService.remove(id); }
}
