import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { GpsDataModule } from '../gps-data/gps-data.module';

@Module({
  imports: [GpsDataModule],
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class TrackingModule {}
