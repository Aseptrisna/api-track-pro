import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Driver, DriverSchema } from './schemas/driver.schema';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { DriversScheduler } from './drivers.scheduler';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Driver.name, schema: DriverSchema }]),
    VehiclesModule,
  ],
  controllers: [DriversController],
  providers: [DriversService, DriversScheduler],
  exports: [DriversService],
})
export class DriversModule {}
