import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ActivityLogService } from './activity-log.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Activity Log')
@ApiBearerAuth()
@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get activity log for current user' })
  @ApiQuery({ name: 'page',   required: false })
  @ApiQuery({ name: 'limit',  required: false })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'from',   required: false, description: 'ISO date string (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to',     required: false, description: 'ISO date string (YYYY-MM-DD)' })
  findAll(
    @CurrentUser() user: any,
    @Query('page')   page?: number,
    @Query('limit')  limit?: number,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('from')   from?: string,
    @Query('to')     to?: string,
  ) {
    return this.activityLogService.findAll({
      page:   page   ? +page   : 1,
      limit:  limit  ? +limit  : 20,
      userId: user.userId,
      module,
      action,
      from,
      to,
    });
  }

  @Get('modules')
  @ApiOperation({ summary: 'Get distinct modules for current user' })
  getModules(@CurrentUser() user: any) {
    return this.activityLogService.getModules(user.userId);
  }
}
