import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('vehicles') @ApiOperation({ summary: 'Vehicle activity report' })
  vehicleReport(@CurrentUser() user: any, @Query('format') format?: string) { return this.reportsService.getVehicleReport(user.userId); }

  @Get('shipments') @ApiOperation({ summary: 'Shipment report' })
  shipmentReport(@Query('format') format?: string) { return this.reportsService.getShipmentReport(); }

  @Get('inventory') @ApiOperation({ summary: 'Inventory report' })
  inventoryReport(@Query('format') format?: string) { return this.reportsService.getInventoryReport(); }
}
