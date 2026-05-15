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

      this.checkSpeedViolation(device, saved.speed || 0)
        .catch(() => { /* non-blocking */ });
    }

    return saved;
  }

  private async checkSpeedViolation(device: any, speed: number): Promise<void> {
    if (speed <= 0) return;

    const vehicle = device.vehicle_id as any;
    const speedLimit: number = vehicle?.speed_limit ?? DEFAULT_SPEED_LIMIT;

    if (speed <= speedLimit) return;

    // Cooldown: skip if a speed alert was already sent in the last 10 minutes
    const lastAlert = this.speedAlertCooldown.get(device.imei) ?? 0;
    if (Date.now() - lastAlert < SPEED_ALERT_COOLDOWN_MS) return;

    this.speedAlertCooldown.set(device.imei, Date.now());

    const vehicleLabel = vehicle?.plate_number
      ? `${vehicle.vehicle_name} (${vehicle.plate_number})`
      : `device ${device.imei}`;

    const ownerId = device.owner?.toString();

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
}
