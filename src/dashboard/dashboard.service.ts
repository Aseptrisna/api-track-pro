import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';
import { Driver } from '../drivers/schemas/driver.schema';
import { GpsData } from '../gps-data/schemas/gps-data.schema';
import { ShipmentsService } from '../shipments/shipments.service';
import { DevicesService } from '../devices/devices.service';

// MongoDB $dayOfWeek: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
const DOW_NAME: Record<number, string> = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    @InjectModel(Driver.name)  private driverModel:  Model<Driver>,
    @InjectModel(GpsData.name) private gpsDataModel: Model<GpsData>,
    private shipmentsService: ShipmentsService,
    private devicesService: DevicesService,
  ) {}

  async getStats(ownerId: string) {
    const ownerOid = new Types.ObjectId(ownerId);
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalVehicles, onlineDevices, totalDrivers,
      pendingShipments, activeShipments,
      serviceOverdue, docsExpiringSoon, licensesExpiringSoon,
    ] = await Promise.all([
      this.vehicleModel.countDocuments({ owner: ownerOid }),
      this.devicesService.countOnlineByOwner(ownerId),
      this.driverModel.countDocuments({ status: { $ne: 'inactive' } }),
      this.shipmentsService.countByStatus('pending'),
      this.shipmentsService.countByStatus('in_transit'),
      this.vehicleModel.countDocuments({
        owner: ownerOid,
        $or: [
          { next_service_date: { $lt: now } },
          { $expr: { $and: [{ $gt: ['$odometer', 0] }, { $lte: ['$next_service_km', '$odometer'] }] } },
        ],
      }),
      this.vehicleModel.countDocuments({
        owner: ownerOid,
        $or: [
          { stnk_expiry:      { $exists: true, $ne: null, $lte: in30Days } },
          { kir_expiry:       { $exists: true, $ne: null, $lte: in30Days } },
          { insurance_expiry: { $exists: true, $ne: null, $lte: in30Days } },
        ],
      }),
      this.driverModel.countDocuments({
        license_expiry_date: { $exists: true, $ne: null, $lte: in30Days },
      }),
    ]);

    return {
      totalVehicles, onlineDevices, totalDrivers,
      pendingShipments, activeShipments,
      serviceOverdue, docsExpiringSoon, licensesExpiringSoon,
    };
  }

  async getFleetUsage(ownerId: string) {
    const result = await this.vehicleModel.aggregate([
      { $match: { owner: new Types.ObjectId(ownerId) } },
      { $group: { _id: '$vehicle_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return result.map((r: any) => ({ type: r._id, count: r.count }));
  }

  async getVehicleActivity(ownerId: string) {
    const ownerOid = new Types.ObjectId(ownerId);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const vehicles = await this.vehicleModel.find({ owner: ownerOid }).lean().exec();
    const totalVehicles = vehicles.length;

    if (!totalVehicles) {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, active: 0, idle: 0 }));
    }

    const vehicleIds = vehicles.map((v: any) => new Types.ObjectId(String(v._id)));

    // Count distinct vehicles that had moving GPS points per day-of-week
    const agg = await this.gpsDataModel.aggregate([
      { $match: { vehicle_id: { $in: vehicleIds }, timestamp: { $gte: sevenDaysAgo }, speed: { $gt: 0 } } },
      { $group: { _id: { dow: { $dayOfWeek: '$timestamp' }, vehicle_id: '$vehicle_id' } } },
      { $group: { _id: '$_id.dow', activeCount: { $sum: 1 } } },
    ]);

    const actMap = new Map<number, number>(agg.map((a: any) => [a._id as number, Math.min(a.activeCount, totalVehicles)]));

    // Return Mon → Sun order (MongoDB dow: Mon=2 … Sun=1)
    const order: Array<[string, number]> = [
      ['Mon', 2], ['Tue', 3], ['Wed', 4], ['Thu', 5], ['Fri', 6], ['Sat', 7], ['Sun', 1],
    ];
    return order.map(([day, dow]) => {
      const active = actMap.get(dow) ?? 0;
      return { day, active, idle: Math.max(0, totalVehicles - active) };
    });
  }

  async getShipmentAnalytics() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      delivered: Math.floor(Math.random() * 100) + 30,
      pending: Math.floor(Math.random() * 30) + 5,
    }));
  }

  // ── Fleet Utilization Analytics ─────────────────────────────────────────────

  async getUtilization(ownerId: string, days = 30) {
    const ownerOid = new Types.ObjectId(ownerId);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const vehicles = await this.vehicleModel.find({ owner: ownerOid }).lean().exec();
    if (!vehicles.length) {
      return {
        summary: { totalDistanceKm: 0, activeVehicles: 0, avgActivePerDay: 0, utilizationRate: 0 },
        dailyTrend: [],
        vehicleBreakdown: [],
        hourlyHeatmap: [],
      };
    }

    const vehicleIds = vehicles.map((v: any) => new Types.ObjectId(String(v._id)));
    const vehicleMap = new Map<string, any>(vehicles.map((v: any) => [String(v._id), v]));

    const [vehicleStats, dailyActive, heatmapRaw] = await Promise.all([

      // Per-vehicle distance (haversine via $setWindowFields), active days, avg/max speed
      this.gpsDataModel.aggregate([
        { $match: { vehicle_id: { $in: vehicleIds }, timestamp: { $gte: since } } },
        { $sort: { vehicle_id: 1, timestamp: 1 } },
        {
          $setWindowFields: {
            partitionBy: '$vehicle_id',
            sortBy: { timestamp: 1 },
            output: {
              prevLat: { $shift: { output: '$latitude',  by: -1 } },
              prevLng: { $shift: { output: '$longitude', by: -1 } },
            },
          },
        },
        {
          $addFields: {
            dLat:    { $toRadians: { $subtract: ['$latitude',  { $ifNull: ['$prevLat', '$latitude']  }] } },
            dLng:    { $toRadians: { $subtract: ['$longitude', { $ifNull: ['$prevLng', '$longitude'] }] } },
            lat1Rad: { $toRadians: { $ifNull: ['$prevLat', '$latitude'] } },
            lat2Rad: { $toRadians: '$latitude' },
          },
        },
        {
          $addFields: {
            hvA: {
              $add: [
                { $pow: [{ $sin: { $divide: ['$dLat', 2] } }, 2] },
                {
                  $multiply: [
                    { $cos: '$lat1Rad' },
                    { $cos: '$lat2Rad' },
                    { $pow: [{ $sin: { $divide: ['$dLng', 2] } }, 2] },
                  ],
                },
              ],
            },
          },
        },
        {
          $addFields: {
            segDistKm: {
              $multiply: [
                6371, 2,
                { $atan2: [{ $sqrt: '$hvA' }, { $sqrt: { $subtract: [1, '$hvA'] } }] },
              ],
            },
          },
        },
        {
          $group: {
            _id:          '$vehicle_id',
            totalDistKm:  { $sum: '$segDistKm' },
            activeDaySet: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } },
            avgSpeed:     { $avg: { $cond: [{ $gt: ['$speed', 0] }, '$speed', null] } },
            maxSpeed:     { $max: '$speed' },
          },
        },
      ]),

      // Daily active vehicle count (vehicles with speed > 0 per calendar day)
      this.gpsDataModel.aggregate([
        { $match: { vehicle_id: { $in: vehicleIds }, timestamp: { $gte: since }, speed: { $gt: 0 } } },
        {
          $group: {
            _id: {
              date:       { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              vehicle_id: '$vehicle_id',
            },
          },
        },
        { $group: { _id: '$_id.date', activeVehicles: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Hourly heatmap: GPS activity by hour-of-day × day-of-week
      this.gpsDataModel.aggregate([
        { $match: { vehicle_id: { $in: vehicleIds }, timestamp: { $gte: since }, speed: { $gt: 0 } } },
        {
          $group: {
            _id:   { hour: { $hour: '$timestamp' }, dow: { $dayOfWeek: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Build vehicle breakdown
    const vehicleBreakdown = vehicleStats
      .map((s: any) => {
        const v = vehicleMap.get(String(s._id));
        if (!v) return null;
        const activeDays = (s.activeDaySet as string[]).length;
        return {
          vehicleId:     String(s._id),
          vehicleName:   v.vehicle_name,
          plateNumber:   v.plate_number,
          totalDistKm:   Math.round(s.totalDistKm * 10) / 10,
          activeDays,
          utilizationPct: Math.round((activeDays / days) * 100),
          avgSpeedKmh:   s.avgSpeed != null ? Math.round(s.avgSpeed) : 0,
          maxSpeedKmh:   Math.round(s.maxSpeed ?? 0),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.totalDistKm - a.totalDistKm);

    // Build daily trend (fill missing days with 0)
    const dailyMap = new Map<string, number>(dailyActive.map((d: any) => [d._id, d.activeVehicles]));
    const dailyTrend = Array.from({ length: days }, (_, i) => {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      return { date: key, activeVehicles: dailyMap.get(key) ?? 0 };
    });

    // Summary
    const totalDistanceKm = vehicleBreakdown.reduce((sum: number, v: any) => sum + v.totalDistKm, 0);
    const activeVehicleCount = vehicleStats.length;
    const totalActiveDaySlots = dailyActive.reduce((sum: number, d: any) => sum + d.activeVehicles, 0);
    const avgActivePerDay = days > 0 ? Math.round((totalActiveDaySlots / days) * 10) / 10 : 0;
    const utilizationRate = vehicles.length > 0 ? Math.round((activeVehicleCount / vehicles.length) * 100) : 0;

    // Normalise heatmap
    const hourlyHeatmap = heatmapRaw.map((h: any) => ({
      hour: h._id.hour as number,
      dow:  h._id.dow  as number,   // 1=Sun … 7=Sat
      day:  DOW_NAME[h._id.dow as number] ?? '?',
      count: h.count   as number,
    }));

    return {
      summary: {
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
        activeVehicles:  activeVehicleCount,
        avgActivePerDay,
        utilizationRate,
      },
      dailyTrend,
      vehicleBreakdown,
      hourlyHeatmap,
    };
  }
}
