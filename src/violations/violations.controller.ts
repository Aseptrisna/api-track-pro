import { Controller, Get, Query } from '@nestjs/common';
import { ViolationsService } from './violations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('violations')
export class ViolationsController {
  constructor(private readonly violationsService: ViolationsService) {}

  @Get('stats')
  getStats(
    @CurrentUser() user: any,
    @Query('vehicleId') vehicleId?: string,
    @Query('days') days?: string,
  ) {
    return this.violationsService.getStats(user.userId, {
      vehicleId,
      days: days ? parseInt(days, 10) : undefined,
    });
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('vehicleId') vehicleId?: string,
    @Query('severity') severity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.violationsService.findAll(user.userId, {
      vehicleId,
      severity,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
