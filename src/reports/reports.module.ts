import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ShipmentsModule } from '../shipments/shipments.module';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FuelLog, FuelLogSchema } from '../fuel-logs/schemas/fuel-log.schema';
import { MaintenanceRecord, MaintenanceRecordSchema } from '../maintenance/schemas/maintenance-record.schema';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';

@Module({
  imports: [
    VehiclesModule, ShipmentsModule, InventoryModule, NotificationsModule,
    MongooseModule.forFeature([
      { name: FuelLog.name,            schema: FuelLogSchema },
      { name: MaintenanceRecord.name,  schema: MaintenanceRecordSchema },
      { name: Vehicle.name,            schema: VehicleSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
