import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GpsData, GpsDataSchema } from './schemas/gps-data.schema';
import { GpsDataService } from './gps-data.service';
import { GpsDataController } from './gps-data.controller';
import { DevicesModule } from '../devices/devices.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { TrackingModule } from '../tracking/tracking.module';
import { GeofenceModule } from '../geofence/geofence.module';
import { ViolationsModule } from '../violations/violations.module';
import { AlertRulesModule } from '../alert-rules/alert-rules.module';
import { IdleLogsModule } from '../idle-logs/idle-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: GpsData.name, schema: GpsDataSchema }]),
    DevicesModule,
    VehiclesModule,
    TrackingModule,
    GeofenceModule,
    ViolationsModule,
    AlertRulesModule,
    IdleLogsModule,
  ],
  controllers: [GpsDataController],
  providers: [GpsDataService],
  exports: [GpsDataService],
})
export class GpsDataModule {}
