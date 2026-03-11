import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats') @ApiOperation({ summary: 'Get dashboard statistics' })
  getStats(@CurrentUser() user: any) { return this.dashboardService.getStats(user.userId); }

  @Get('fleet-usage') @ApiOperation({ summary: 'Get fleet usage by vehicle type' })
  getFleetUsage(@CurrentUser() user: any) { return this.dashboardService.getFleetUsage(user.userId); }

  @Get('vehicle-activity') @ApiOperation({ summary: 'Get vehicle activity data' })
  getVehicleActivity(@CurrentUser() user: any) { return this.dashboardService.getVehicleActivity(user.userId); }

  @Get('shipment-analytics') @ApiOperation({ summary: 'Get shipment analytics' })
  getShipmentAnalytics() { return this.dashboardService.getShipmentAnalytics(); }
}
