import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@ApiTags('Drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post() @ApiOperation({ summary: 'Add driver' })
  create(@Body() dto: CreateDriverDto) { return this.driversService.create(dto); }

  @Get() @ApiOperation({ summary: 'Get all drivers' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.driversService.findAll(page || 1, limit || 10, search);
  }

  @Get(':id') @ApiOperation({ summary: 'Get driver by ID' })
  findOne(@Param('id') id: string) { return this.driversService.findById(id); }

  @Put(':id') @ApiOperation({ summary: 'Update driver' })
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) { return this.driversService.update(id, dto); }

  @Delete(':id') @ApiOperation({ summary: 'Delete driver' })
  remove(@Param('id') id: string) { return this.driversService.remove(id); }
}
