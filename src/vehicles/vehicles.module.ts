import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { VehiclesScheduler } from './vehicles.scheduler';
import { VehicleAssignmentsModule } from '../vehicle-assignments/vehicle-assignments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Driver.name,  schema: DriverSchema  },
    ]),
    VehicleAssignmentsModule,
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesScheduler],
  exports: [VehiclesService],
})
export class VehiclesModule {}
