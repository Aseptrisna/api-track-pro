import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AlertRulesService } from './alert-rules.service';
import { UpsertAlertRuleDto } from './dto/upsert-alert-rule.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Alert Rules')
@ApiBearerAuth()
@Controller('alert-rules')
export class AlertRulesController {
  constructor(private readonly alertRulesService: AlertRulesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all alert rules for the current user (one per vehicle)' })
  findAll(@CurrentUser() user: any) {
    return this.alertRulesService.findAllByOwner(user.userId);
  }

  @Put(':vehicleId')
  @ApiOperation({ summary: 'Create or update alert rule for a vehicle' })
  upsert(
    @Param('vehicleId') vehicleId: string,
    @Body() dto: UpsertAlertRuleDto,
    @CurrentUser() user: any,
  ) {
    return this.alertRulesService.upsert(user.userId, vehicleId, dto);
  }
}
