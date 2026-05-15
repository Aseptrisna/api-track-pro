import { Injectable } from '@nestjs/common';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReportsService {
  constructor(
    private vehiclesService: VehiclesService,
    private shipmentsService: ShipmentsService,
    private inventoryService: InventoryService,
    private notificationsService: NotificationsService,
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

  async getFleetSummary(ownerId: string) {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [vehiclesResult, alertStats] = await Promise.all([
      this.vehiclesService.findAll(ownerId, 1, 1000),
      this.notificationsService.getAlertStats(ownerId, 30),
    ]);

    const vehicles = vehiclesResult.data as any[];

    // Count by status
    const statusCounts = { active: 0, inactive: 0, maintenance: 0 };
    let serviceOverdue = 0;
    let serviceDueSoon7 = 0;
    let serviceDueSoon30 = 0;

    const vehicleSummaries = vehicles.map((v: any) => {
      const status = v.status || 'active';
      if (statusCounts[status as keyof typeof statusCounts] !== undefined) {
        statusCounts[status as keyof typeof statusCounts]++;
      }

      // Service status
      let serviceStatus: 'overdue' | 'due_7d' | 'due_30d' | 'ok' | 'none' = 'none';
      if (v.next_service_date || v.next_service_km != null) {
        const hasDateOverdue = v.next_service_date && new Date(v.next_service_date) < now;
        const hasKmOverdue = v.next_service_km != null && v.odometer != null && v.odometer >= v.next_service_km;

        if (hasDateOverdue || hasKmOverdue) {
          serviceStatus = 'overdue';
          serviceOverdue++;
        } else {
          const dateIn7 = v.next_service_date && new Date(v.next_service_date) <= in7Days;
          const kmIn1000 = v.next_service_km != null && v.odometer != null && (v.next_service_km - v.odometer) <= 1000;
          const dateIn30 = v.next_service_date && new Date(v.next_service_date) <= in30Days;
          const kmIn5000 = v.next_service_km != null && v.odometer != null && (v.next_service_km - v.odometer) <= 5000;

          if (dateIn7 || kmIn1000) {
            serviceStatus = 'due_7d';
            serviceDueSoon7++;
            serviceDueSoon30++;
          } else if (dateIn30 || kmIn5000) {
            serviceStatus = 'due_30d';
            serviceDueSoon30++;
          } else {
            serviceStatus = 'ok';
          }
        }
      }

      return {
        _id: v._id,
        vehicle_name: v.vehicle_name,
        plate_number: v.plate_number,
        brand: v.brand,
        model: v.model,
        vehicle_type: v.vehicle_type,
        status: v.status,
        odometer: v.odometer,
        next_service_date: v.next_service_date,
        next_service_km: v.next_service_km,
        last_service_date: v.last_service_date,
        service_notes: v.service_notes,
        serviceStatus,
      };
    });

    return {
      generated_at: now,
      vehicles: {
        total: vehicles.length,
        ...statusCounts,
        service_overdue: serviceOverdue,
        service_due_7d: serviceDueSoon7,
        service_due_30d: serviceDueSoon30,
      },
      alerts: alertStats,
      vehicle_list: vehicleSummaries,
    };
  }
}
