import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { DistributionService } from './distribution.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionDto } from './dto/update-distribution.dto';

@ApiTags('Distribution')
@ApiBearerAuth()
@Controller('distribution')
export class DistributionController {
  constructor(private readonly distributionService: DistributionService) {}

  @Post() @ApiOperation({ summary: 'Create distribution' }) create(@Body() dto: CreateDistributionDto) { return this.distributionService.create(dto); }
  @Get() @ApiOperation({ summary: 'Get all distributions' }) findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: string) { return this.distributionService.findAll(page || 1, limit || 10, status); }
  @Get(':id') @ApiOperation({ summary: 'Get distribution' }) findOne(@Param('id') id: string) { return this.distributionService.findById(id); }
  @Put(':id') @ApiOperation({ summary: 'Update distribution' }) update(@Param('id') id: string, @Body() dto: UpdateDistributionDto) { return this.distributionService.update(id, dto); }
  @Delete(':id') @ApiOperation({ summary: 'Delete distribution' }) remove(@Param('id') id: string) { return this.distributionService.remove(id); }
}
