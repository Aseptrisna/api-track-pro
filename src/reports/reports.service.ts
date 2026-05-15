import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FuelLog } from '../fuel-logs/schemas/fuel-log.schema';
import { MaintenanceRecord } from '../maintenance/schemas/maintenance-record.schema';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';

@Injectable()
export class ReportsService {
  constructor(
    private vehiclesService: VehiclesService,
    private shipmentsService: ShipmentsService,
    private inventoryService: InventoryService,
    private notificationsService: NotificationsService,
    @InjectModel(FuelLog.name)           private fuelLogModel: Model<FuelLog>,
    @InjectModel(MaintenanceRecord.name) private maintenanceModel: Model<MaintenanceRecord>,
    @InjectModel(Vehicle.name)           private vehicleModel: Model<Vehicle>,
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

    const statusCounts = { active: 0, inactive: 0, maintenance: 0 };
    let serviceOverdue = 0;
    let serviceDueSoon7 = 0;
    let serviceDueSoon30 = 0;

    const vehicleSummaries = vehicles.map((v: any) => {
      const status = v.status || 'active';
      if (statusCounts[status as keyof typeof statusCounts] !== undefined) {
        statusCounts[status as keyof typeof statusCounts]++;
      }

      let serviceStatus: 'overdue' | 'due_7d' | 'due_30d' | 'ok' | 'none' = 'none';
      if (v.next_service_date || v.next_service_km != null) {
        const hasDateOverdue = v.next_service_date && new Date(v.next_service_date) < now;
        const hasKmOverdue = v.next_service_km != null && v.odometer != null && v.odometer >= v.next_service_km;

        if (hasDateOverdue || hasKmOverdue) {
          serviceStatus = 'overdue'; serviceOverdue++;
        } else {
          const dateIn7  = v.next_service_date && new Date(v.next_service_date) <= in7Days;
          const kmIn1000 = v.next_service_km != null && v.odometer != null && (v.next_service_km - v.odometer) <= 1000;
          const dateIn30 = v.next_service_date && new Date(v.next_service_date) <= in30Days;
          const kmIn5000 = v.next_service_km != null && v.odometer != null && (v.next_service_km - v.odometer) <= 5000;

          if (dateIn7 || kmIn1000)       { serviceStatus = 'due_7d';  serviceDueSoon7++; serviceDueSoon30++; }
          else if (dateIn30 || kmIn5000) { serviceStatus = 'due_30d'; serviceDueSoon30++; }
          else                           { serviceStatus = 'ok'; }
        }
      }

      return {
        _id: v._id, vehicle_name: v.vehicle_name, plate_number: v.plate_number,
        brand: v.brand, model: v.model, vehicle_type: v.vehicle_type, status: v.status,
        odometer: v.odometer, next_service_date: v.next_service_date, next_service_km: v.next_service_km,
        last_service_date: v.last_service_date, service_notes: v.service_notes, serviceStatus,
      };
    });

    return {
      generated_at: now,
      vehicles: { total: vehicles.length, ...statusCounts, service_overdue: serviceOverdue, service_due_7d: serviceDueSoon7, service_due_30d: serviceDueSoon30 },
      alerts: alertStats,
      vehicle_list: vehicleSummaries,
    };
  }

  async getExpenseReport(ownerId: string, year: number, vehicleId?: string) {
    const ownerOid = new Types.ObjectId(ownerId);
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year + 1, 0, 1);

    // Base vehicle filter for this owner
    const vehicleMatch: any = { owner: ownerOid };
    if (vehicleId) vehicleMatch._id = new Types.ObjectId(vehicleId);
    const ownedVehicles = await this.vehicleModel.find(vehicleMatch, '_id vehicle_name plate_number').lean();
    const vehicleIds = ownedVehicles.map((v: any) => v._id);

    if (vehicleIds.length === 0) {
      return this.emptyExpenseReport(year, ownedVehicles);
    }

    const fuelFilter        = { vehicle: { $in: vehicleIds }, date: { $gte: yearStart, $lt: yearEnd } };
    const maintenanceFilter = { vehicle: { $in: vehicleIds }, date: { $gte: yearStart, $lt: yearEnd } };

    const MONTHS = Array.from({ length: 12 }, (_, i) =>
      `${year}-${String(i + 1).padStart(2, '0')}`,
    );

    const [fuelMonthly, fuelByVehicle, maintMonthly, maintByVehicle] = await Promise.all([
      // Fuel monthly
      this.fuelLogModel.aggregate([
        { $match: fuelFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, fuel: { $sum: { $multiply: ['$liters', '$cost_per_liter'] } }, liters: { $sum: '$liters' } } },
        { $sort: { _id: 1 } },
      ]),
      // Fuel by vehicle
      this.fuelLogModel.aggregate([
        { $match: fuelFilter },
        { $group: { _id: '$vehicle', fuel: { $sum: { $multiply: ['$liters', '$cost_per_liter'] } }, liters: { $sum: '$liters' }, fills: { $sum: 1 } } },
      ]),
      // Maintenance monthly
      this.maintenanceModel.aggregate([
        { $match: maintenanceFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, maintenance: { $sum: '$cost' }, records: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Maintenance by vehicle
      this.maintenanceModel.aggregate([
        { $match: maintenanceFilter },
        { $group: { _id: '$vehicle', maintenance: { $sum: '$cost' }, records: { $sum: 1 } } },
      ]),
    ]);

    // Merge monthly data into a full 12-month series
    const fuelMap  = new Map(fuelMonthly.map((r: any) => [r._id, r]));
    const maintMap = new Map(maintMonthly.map((r: any) => [r._id, r]));

    const monthlyTrend = MONTHS.map((m) => ({
      month:       m,
      fuel:        Math.round((fuelMap.get(m) as any)?.fuel  ?? 0),
      maintenance: Math.round((maintMap.get(m) as any)?.maintenance ?? 0),
      total:       Math.round(((fuelMap.get(m) as any)?.fuel ?? 0) + ((maintMap.get(m) as any)?.maintenance ?? 0)),
    }));

    // Merge per-vehicle
    const fuelVMap  = new Map(fuelByVehicle.map((r: any) => [String(r._id), r]));
    const maintVMap = new Map(maintByVehicle.map((r: any) => [String(r._id), r]));

    const byVehicle = ownedVehicles.map((v: any) => {
      const id = String(v._id);
      const f  = (fuelVMap.get(id) as any) ?? { fuel: 0, liters: 0, fills: 0 };
      const mt = (maintVMap.get(id) as any) ?? { maintenance: 0, records: 0 };
      const fuelCost  = Math.round(f.fuel ?? 0);
      const maintCost = Math.round(mt.maintenance ?? 0);
      return {
        vehicleId:    id,
        vehicleName:  v.vehicle_name,
        plateNumber:  v.plate_number,
        fuelCost,
        fuelLiters:   Math.round((f.liters ?? 0) * 10) / 10,
        fuelFills:    f.fills ?? 0,
        maintCost,
        maintRecords: mt.records ?? 0,
        totalCost:    fuelCost + maintCost,
      };
    }).sort((a, b) => b.totalCost - a.totalCost);

    const totalFuel  = byVehicle.reduce((s, v) => s + v.fuelCost, 0);
    const totalMaint = byVehicle.reduce((s, v) => s + v.maintCost, 0);

    return {
      year,
      summary: {
        totalFuel,
        totalMaintenance: totalMaint,
        totalCost: totalFuel + totalMaint,
        vehicleCount: ownedVehicles.length,
      },
      monthlyTrend,
      byVehicle,
    };
  }

  private emptyExpenseReport(year: number, vehicles: any[]) {
    const MONTHS = Array.from({ length: 12 }, (_, i) =>
      `${year}-${String(i + 1).padStart(2, '0')}`,
    );
    return {
      year,
      summary: { totalFuel: 0, totalMaintenance: 0, totalCost: 0, vehicleCount: vehicles.length },
      monthlyTrend: MONTHS.map((m) => ({ month: m, fuel: 0, maintenance: 0, total: 0 })),
      byVehicle: [],
    };
  }
}
