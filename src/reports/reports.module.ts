import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ShipmentsModule } from '../shipments/shipments.module';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [VehiclesModule, ShipmentsModule, InventoryModule, NotificationsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
