import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post() @ApiOperation({ summary: 'Create inventory' }) create(@Body() dto: CreateInventoryDto) { return this.inventoryService.create(dto); }
  @Get() @ApiOperation({ summary: 'Get all inventory' }) findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.inventoryService.findAll(page || 1, limit || 10, search); }
  @Get('low-stock') @ApiOperation({ summary: 'Get low stock items' }) getLowStock() { return this.inventoryService.getLowStock(); }
  @Get(':id') @ApiOperation({ summary: 'Get inventory item' }) findOne(@Param('id') id: string) { return this.inventoryService.findById(id); }
  @Put(':id') @ApiOperation({ summary: 'Update inventory' }) update(@Param('id') id: string, @Body() dto: UpdateInventoryDto) { return this.inventoryService.update(id, dto); }
  @Delete(':id') @ApiOperation({ summary: 'Delete inventory' }) remove(@Param('id') id: string) { return this.inventoryService.remove(id); }
}
