import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlertRule, AlertRuleSchema } from './schemas/alert-rule.schema';
import { AlertRulesService } from './alert-rules.service';
import { AlertRulesController } from './alert-rules.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AlertRule.name, schema: AlertRuleSchema }]),
    VehiclesModule,
  ],
  controllers: [AlertRulesController],
  providers: [AlertRulesService],
  exports: [AlertRulesService],
})
export class AlertRulesModule {}
