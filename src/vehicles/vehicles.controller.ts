import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Create vehicle' })
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: any) {
    return this.vehiclesService.create(dto, user.userId);
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
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto, @CurrentUser() user: any) {
    return this.vehiclesService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vehicle' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.vehiclesService.remove(id, user.userId);
  }
}
