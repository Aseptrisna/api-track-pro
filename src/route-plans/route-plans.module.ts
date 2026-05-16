import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoutePlansController } from './route-plans.controller';
import { RoutePlansService }    from './route-plans.service';
import { RoutePlan, RoutePlanSchema } from './schemas/route-plan.schema';
import { Vehicle, VehicleSchema }    from '../vehicles/schemas/vehicle.schema';
import { Driver,  DriverSchema  }    from '../drivers/schemas/driver.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoutePlan.name, schema: RoutePlanSchema },
      { name: Vehicle.name,  schema: VehicleSchema   },
      { name: Driver.name,   schema: DriverSchema    },
    ]),
  ],
  controllers: [RoutePlansController],
  providers:   [RoutePlansService],
})
export class RoutePlansModule {}
