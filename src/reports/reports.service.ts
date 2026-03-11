import { Injectable } from '@nestjs/common';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ReportsService {
  constructor(
    private vehiclesService: VehiclesService,
    private shipmentsService: ShipmentsService,
    private inventoryService: InventoryService,
  ) {}

  async getVehicleReport(ownerId: string) {
    const result = await this.vehiclesService.findAll(ownerId, 1, 1000);
    return { report: 'Vehicle Activity Report', generated_at: new Date(), total: result.total, data: result.data };
  }

  async getShipmentReport() {
    const result = await this.shipmentsService.findAll(1, 1000);
    return { report: 'Shipment Report', generated_at: new Date(), total: result.total, data: result.data };
  }

  async getInventoryReport() {
    const result = await this.inventoryService.findAll(1, 1000);
    const lowStock = await this.inventoryService.getLowStock();
    return { report: 'Inventory Report', generated_at: new Date(), total: result.total, data: result.data, lowStockItems: lowStock };
  }
}
