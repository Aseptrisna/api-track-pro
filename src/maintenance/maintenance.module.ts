import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaintenanceRecord, MaintenanceRecordSchema } from './schemas/maintenance-record.schema';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MaintenanceRecord.name, schema: MaintenanceRecordSchema },
      { name: Vehicle.name, schema: VehicleSchema },
    ]),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
