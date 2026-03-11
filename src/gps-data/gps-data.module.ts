import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GpsData, GpsDataSchema } from './schemas/gps-data.schema';
import { GpsDataService } from './gps-data.service';
import { GpsDataController } from './gps-data.controller';
import { DevicesModule } from '../devices/devices.module';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: GpsData.name, schema: GpsDataSchema }]),
    DevicesModule,
    VehiclesModule,
  ],
  controllers: [GpsDataController],
  providers: [GpsDataService],
  exports: [GpsDataService],
})
export class GpsDataModule {}
