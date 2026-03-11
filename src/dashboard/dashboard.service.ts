import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';
import { ShipmentsService } from '../shipments/shipments.service';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    private shipmentsService: ShipmentsService,
    private devicesService: DevicesService,
  ) {}

  async getStats(ownerId: string) {
    const [totalVehicles, onlineDevices, activeShipments, todayDeliveries] = await Promise.all([
      this.vehicleModel.countDocuments({ owner: ownerId }),
      this.devicesService.countOnline(),
      this.shipmentsService.countByStatus('in_transit'),
      this.shipmentsService.countToday(),
    ]);
    return { totalVehicles, onlineDevices, activeShipments, todayDeliveries };
  }

  async getFleetUsage(ownerId: string) {
    const result = await this.vehicleModel.aggregate([
      { $match: { owner: ownerId } },
      { $group: { _id: '$vehicle_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return result.map((r: any) => ({ type: r._id, count: r.count }));
  }

  async getVehicleActivity(ownerId: string) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const totalVehicles = await this.vehicleModel.countDocuments({ owner: ownerId });
    return days.map(day => ({
      day,
      active: Math.min(Math.floor(Math.random() * (totalVehicles || 5)) + 1, totalVehicles || 5),
      idle: Math.floor(Math.random() * Math.max(totalVehicles / 3, 2)),
    }));
  }

  async getShipmentAnalytics() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({ month, delivered: Math.floor(Math.random() * 100) + 30, pending: Math.floor(Math.random() * 30) + 5 }));
  }
}
