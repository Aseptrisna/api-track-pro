import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportSchedulesService, CreateScheduleDto } from './report-schedules.service';
import { ReportSchedulesScheduler } from './report-schedules.scheduler';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Report Schedules')
@ApiBearerAuth()
@Controller('report-schedules')
export class ReportSchedulesController {
  constructor(
    private readonly service:   ReportSchedulesService,
    private readonly scheduler: ReportSchedulesScheduler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all report schedules for the current user' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a report schedule' })
  create(@CurrentUser() user: any, @Body() dto: CreateScheduleDto) {
    return this.service.create(user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a report schedule' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateScheduleDto & { enabled: boolean }>,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a report schedule' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(id, user.userId);
  }

  @Post(':id/send-now')
  @ApiOperation({ summary: 'Manually trigger a report send' })
  async sendNow(@CurrentUser() user: any, @Param('id') id: string) {
    const schedules = await this.service.findAll(user.userId) as any[];
    const schedule  = schedules.find((s) => String(s._id) === id);
    if (!schedule) return { error: 'Not found' };
    await this.scheduler.sendReport(schedule);
    await this.service.markSent(id);
    return { sent: true };
  }
}
