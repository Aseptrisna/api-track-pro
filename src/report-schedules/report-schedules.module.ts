import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportSchedule, ReportScheduleSchema } from './schemas/report-schedule.schema';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';
import { Violation, ViolationSchema } from '../violations/schemas/violation.schema';
import { IdleLog, IdleLogSchema } from '../idle-logs/schemas/idle-log.schema';
import { ReportSchedulesService } from './report-schedules.service';
import { ReportSchedulesScheduler } from './report-schedules.scheduler';
import { ReportSchedulesController } from './report-schedules.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReportSchedule.name, schema: ReportScheduleSchema },
      { name: Vehicle.name,        schema: VehicleSchema        },
      { name: Violation.name,      schema: ViolationSchema      },
      { name: IdleLog.name,        schema: IdleLogSchema        },
    ]),
  ],
  controllers: [ReportSchedulesController],
  providers:   [ReportSchedulesService, ReportSchedulesScheduler],
})
export class ReportSchedulesModule {}
