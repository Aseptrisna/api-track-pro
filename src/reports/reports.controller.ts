import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('vehicles') @ApiOperation({ summary: 'Vehicle activity report' })
  vehicleReport(@CurrentUser() user: any) { return this.reportsService.getVehicleReport(user.userId); }

  @Get('shipments') @ApiOperation({ summary: 'Shipment report' })
  shipmentReport() { return this.reportsService.getShipmentReport(); }

  @Get('inventory') @ApiOperation({ summary: 'Inventory report' })
  inventoryReport() { return this.reportsService.getInventoryReport(); }

  @Get('fleet') @ApiOperation({ summary: 'Fleet summary report (vehicles + alerts)' })
  fleetSummary(@CurrentUser() user: any) { return this.reportsService.getFleetSummary(user.userId); }

  @Get('expenses')
  @ApiOperation({ summary: 'Expense report — combined fuel + maintenance cost per vehicle' })
  @ApiQuery({ name: 'year',      required: false, description: 'Full year (default: current year)' })
  @ApiQuery({ name: 'vehicleId', required: false })
  expenseReport(
    @CurrentUser() user: any,
    @Query('year')      year?: number,
    @Query('vehicleId') vehicleId?: string,
  ) {
    const y = year ? +year : new Date().getFullYear();
    return this.reportsService.getExpenseReport(user.userId, y, vehicleId);
  }
}
