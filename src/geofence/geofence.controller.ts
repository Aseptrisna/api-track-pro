import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { GeofenceService } from './geofence.service';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';

@ApiTags('Geofence')
@ApiBearerAuth()
@Controller('geofences')
export class GeofenceController {
  constructor(private readonly geofenceService: GeofenceService) {}

  @Post() @ApiOperation({ summary: 'Create geofence' }) create(@Body() dto: CreateGeofenceDto) { return this.geofenceService.create(dto); }
  @Get() @ApiOperation({ summary: 'Get all geofences' }) findAll() { return this.geofenceService.findAll(); }
  @Get(':id') @ApiOperation({ summary: 'Get geofence' }) findOne(@Param('id') id: string) { return this.geofenceService.findById(id); }
  @Put(':id') @ApiOperation({ summary: 'Update geofence' }) update(@Param('id') id: string, @Body() dto: UpdateGeofenceDto) { return this.geofenceService.update(id, dto); }
  @Delete(':id') @ApiOperation({ summary: 'Delete geofence' }) remove(@Param('id') id: string) { return this.geofenceService.remove(id); }
}
