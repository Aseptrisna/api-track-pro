import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FuelLog, FuelLogSchema } from './schemas/fuel-log.schema';
import { FuelLogsService } from './fuel-logs.service';
import { FuelLogsController } from './fuel-logs.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: FuelLog.name, schema: FuelLogSchema }])],
  controllers: [FuelLogsController],
  providers: [FuelLogsService],
})
export class FuelLogsModule {}
