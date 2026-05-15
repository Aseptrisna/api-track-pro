import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GpsData } from './schemas/gps-data.schema';
import { CreateGpsDataDto } from './dto/create-gps-data.dto';
import { DevicesService } from '../devices/devices.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { GeofenceService } from '../geofence/geofence.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ViolationsService } from '../violations/violations.service';

const DEFAULT_SPEED_LIMIT = 80; // km/h
const SPEED_ALERT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes per device

@Injectable()
export class GpsDataService {
  private readonly speedAlertCooldown = new Map<string, number>();

  constructor(
    @InjectModel(GpsData.name) private gpsDataModel: Model<GpsData>,
    private devicesService: DevicesService,
    private vehiclesService: VehiclesService,
    private trackingGateway: TrackingGateway,
    private geofenceService: GeofenceService,
    private notificationsService: NotificationsService,
    private violationsService: ViolationsService,
  ) {}

  async create(dto: CreateGpsDataDto): Promise<GpsData> {
    const device = await this.devicesService.findByImei(dto.imei);
    const data: any = { ...dto };
    if (device?.vehicle_id) data.vehicle_id = device.vehicle_id;

    // Get previous GPS point before marking device online
    const prevData = await this.gpsDataModel
      .findOne({ imei: dto.imei })
      .sort({ timestamp: -1 })
      .exec();

    await this.devicesService.updateStatus(dto.imei, 'online');
    const saved = await this.gpsDataModel.create(data);

    // Broadcast to WebSocket clients
    this.trackingGateway.emitLocationUpdate({
      _id: saved._id,
      imei: saved.imei,
      vehicle_id: saved.vehicle_id?.toString() || null,
      latitude: saved.latitude,
      longitude: saved.longitude,
      speed: saved.speed || 0,
      course: saved.course || 0,
      timestamp: saved.timestamp,
    });

    // Check geofence transitions and speed — both non-blocking
    if (device) {
      this.checkGeofenceTransitions(
        device,
        prevData,
        saved.latitude,
        saved.longitude,
      ).catch(() => { /* non-blocking */ });

      this.checkSpeedViolation(device, saved.speed || 0, saved)
        .catch(() => { /* non-blocking */ });
    }

    return saved;
  }

  private async checkSpeedViolation(
    device: any,
    speed: number,
    savedPoint: GpsData,
  ): Promise<void> {
    if (speed <= 0) return;

    const vehicle = device.vehicle_id as any;
    const speedLimit: number = vehicle?.speed_limit ?? DEFAULT_SPEED_LIMIT;

    if (speed <= speedLimit) return;

    const ownerId = device.owner?.toString();

    // Always persist a violation record (per GPS point over limit)
    await this.violationsService
      .log({
        vehicle: vehicle?._id?.toString() ?? vehicle?.toString(),
        imei: device.imei,
        timestamp: savedPoint.timestamp,
        speed,
        speed_limit: speedLimit,
        latitude: savedPoint.latitude,
        longitude: savedPoint.longitude,
        owner: ownerId,
      })
      .catch(() => null);

    // Cooldown: throttle notifications to once per 10 minutes per device
    const lastAlert = this.speedAlertCooldown.get(device.imei) ?? 0;
    if (Date.now() - lastAlert < SPEED_ALERT_COOLDOWN_MS) return;

    this.speedAlertCooldown.set(device.imei, Date.now());

    const vehicleLabel = vehicle?.plate_number
      ? `${vehicle.vehicle_name} (${vehicle.plate_number})`
      : `device ${device.imei}`;

    await this.notificationsService.create({
      title: 'Speed limit exceeded',
      message: `${vehicleLabel} is travelling at ${speed} km/h, exceeding the ${speedLimit} km/h limit.`,
      type: 'warning',
      user: ownerId,
    });

    this.trackingGateway.emitAlert({
      event: 'speed_violation',
      imei: device.imei,
      speed,
      speedLimit,
    });
  }

  private async checkGeofenceTransitions(
    device: any,
    prevData: GpsData | null,
    lat: number,
    lng: number,
  ): Promise<void> {
    const geofences = await this.geofenceService.findAll();
    if (!geofences.length) return;

    const ownerId = device.owner?.toString();
    const label = (device as any).vehicle_id
      ? `vehicle linked to ${device.imei}`
      : `device ${device.imei}`;

    for (const fence of geofences) {
      const nowInside = this.geofenceService.isPointInPolygon(
        lat, lng, fence.polygon_coordinates,
      );

      const prevInside = prevData
        ? this.geofenceService.isPointInPolygon(
            prevData.latitude, prevData.longitude, fence.polygon_coordinates,
          )
        : false;

      if (!prevInside && nowInside) {
        // Entered geofence
        await this.notificationsService.create({
          title: `Entered geofence: ${fence.name}`,
          message: `A ${label} has entered the "${fence.name}" zone.`,
          type: fence.type === 'restricted' ? 'alert' : 'info',
          user: ownerId,
        });
        this.trackingGateway.emitAlert({
          event: 'geofence_enter',
          geofence: fence.name,
          imei: device.imei,
        });
      } else if (prevInside && !nowInside) {
        // Exited geofence
        await this.notificationsService.create({
          title: `Exited geofence: ${fence.name}`,
          message: `A ${label} has exited the "${fence.name}" zone.`,
          type: fence.type === 'restricted' ? 'alert' : 'warning',
          user: ownerId,
        });
        this.trackingGateway.emitAlert({
          event: 'geofence_exit',
          geofence: fence.name,
          imei: device.imei,
        });
      }
    }
  }

  async getLatestByImei(imei: string): Promise<GpsData | null> {
    return this.gpsDataModel.findOne({ imei }).sort({ timestamp: -1 }).exec();
  }

  async getLatestByVehicle(vehicleId: string): Promise<GpsData | null> {
    return this.gpsDataModel.findOne({ vehicle_id: new Types.ObjectId(vehicleId) }).sort({ timestamp: -1 }).exec();
  }

  async getHistory(imei: string, startDate: Date, endDate: Date): Promise<GpsData[]> {
    return this.gpsDataModel.find({
      imei,
      timestamp: { $gte: startDate, $lte: endDate },
    }).sort({ timestamp: 1 }).exec();
  }

  async getVehicleHistory(vehicleId: string, startDate: Date, endDate: Date): Promise<GpsData[]> {
    return this.gpsDataModel.find({
      vehicle_id: new Types.ObjectId(vehicleId),
      timestamp: { $gte: startDate, $lte: endDate },
    }).sort({ timestamp: 1 }).exec();
  }

  async getAllLatest(): Promise<GpsData[]> {
    return this.gpsDataModel.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$imei', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);
  }

  async getAllLatestByOwner(ownerId: string): Promise<GpsData[]> {
    const vehicles = await this.vehiclesService.getAllByOwner(ownerId);
    const vehicleIds = vehicles.map((v: any) => new Types.ObjectId(String(v._id)));

    if (vehicleIds.length === 0) return [];

    return this.gpsDataModel.aggregate([
      { $match: { vehicle_id: { $in: vehicleIds } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$vehicle_id', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);
  }

  async verifyVehicleOwnership(vehicleId: string, ownerId: string): Promise<void> {
    try {
      await this.vehiclesService.findById(vehicleId, ownerId);
    } catch {
      throw new ForbiddenException('Vehicle not found or access denied');
    }
  }

  // ── Trip detection ──────────────────────────────────────────────────────────
  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async detectTrips(vehicleId: string, startDate: Date, endDate: Date) {
    const IDLE_GAP_MS   = 5 * 60 * 1000;  // 5-minute gap = trip boundary
    const MIN_POINTS    = 3;               // minimum GPS points for a valid trip
    const MIN_DIST_KM   = 0.1;            // minimum 100m to count as a trip

    const points = await this.gpsDataModel.find({
      vehicle_id: new Types.ObjectId(vehicleId),
      timestamp: { $gte: startDate, $lte: endDate },
    }).sort({ timestamp: 1 }).lean().exec();

    if (points.length < MIN_POINTS) return [];

    const trips: any[] = [];
    let segment: typeof points = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const gap = new Date(points[i].timestamp).getTime() - new Date(points[i - 1].timestamp).getTime();
      if (gap > IDLE_GAP_MS) {
        // Close current segment, open new one
        if (segment.length >= MIN_POINTS) trips.push(this.buildTrip(segment, MIN_DIST_KM));
        segment = [points[i]];
      } else {
        segment.push(points[i]);
      }
    }
    // Flush last segment
    if (segment.length >= MIN_POINTS) trips.push(this.buildTrip(segment, MIN_DIST_KM));

    return trips.filter(Boolean);
  }

  private buildTrip(points: any[], minDistKm: number) {
    let distKm = 0;
    let maxSpeed = 0;
    let speedSum = 0;
    let movingPoints = 0;

    for (let i = 1; i < points.length; i++) {
      distKm += this.haversineKm(
        points[i - 1].latitude, points[i - 1].longitude,
        points[i].latitude,     points[i].longitude,
      );
    }
    for (const p of points) {
      const s = p.speed ?? 0;
      if (s > maxSpeed) maxSpeed = s;
      if (s > 0) { speedSum += s; movingPoints++; }
    }
    if (distKm < minDistKm) return null;

    const startTime = new Date(points[0].timestamp);
    const endTime   = new Date(points[points.length - 1].timestamp);
    const durationMin = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    return {
      startTime:    startTime.toISOString(),
      endTime:      endTime.toISOString(),
      durationMin,
      distanceKm:   Math.round(distKm * 100) / 100,
      avgSpeedKmh:  movingPoints > 0 ? Math.round(speedSum / movingPoints) : 0,
      maxSpeedKmh:  Math.round(maxSpeed),
      pointCount:   points.length,
      startLat:     points[0].latitude,
      startLng:     points[0].longitude,
      endLat:       points[points.length - 1].latitude,
      endLng:       points[points.length - 1].longitude,
      // Sampled path for map display (max 200 points)
      path: points.length > 200
        ? points.filter((_, i) => i % Math.ceil(points.length / 200) === 0)
            .map((p) => [p.latitude, p.longitude])
        : points.map((p) => [p.latitude, p.longitude]),
    };
  }
}
