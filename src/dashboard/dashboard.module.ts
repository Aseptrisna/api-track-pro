import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { ShipmentsModule } from '../shipments/shipments.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Driver.name,  schema: DriverSchema  },
    ]),
    ShipmentsModule,
    DevicesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
