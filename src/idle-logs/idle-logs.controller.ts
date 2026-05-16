import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IdleLogsService } from './idle-logs.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Idle Logs')
@ApiBearerAuth()
@Controller('idle-logs')
export class IdleLogsController {
  constructor(private readonly service: IdleLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated idle log events' })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate',   required: false })
  @ApiQuery({ name: 'page',      required: false })
  @ApiQuery({ name: 'limit',     required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?:   string,
    @Query('page')      page?:      string,
    @Query('limit')     limit?:     string,
  ) {
    return this.service.findAll(
      user.userId,
      vehicleId,
      startDate,
      endDate,
      Number(page)  || 1,
      Number(limit) || 20,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get idle time statistics per vehicle' })
  @ApiQuery({ name: 'days', required: false })
  getStats(@CurrentUser() user: any, @Query('days') days?: string) {
    return this.service.getStats(user.userId, Number(days) || 30);
  }
}
