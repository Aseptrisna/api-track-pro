import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GpsData } from './schemas/gps-data.schema';
import { CreateGpsDataDto } from './dto/create-gps-data.dto';
import { DevicesService } from '../devices/devices.service';
import { VehiclesService } from '../vehicles/vehicles.service';

@Injectable()
export class GpsDataService {
  constructor(
    @InjectModel(GpsData.name) private gpsDataModel: Model<GpsData>,
    private devicesService: DevicesService,
    private vehiclesService: VehiclesService,
  ) {}

  async create(dto: CreateGpsDataDto): Promise<GpsData> {
    const device = await this.devicesService.findByImei(dto.imei);
    const data: any = { ...dto };
    if (device?.vehicle_id) data.vehicle_id = device.vehicle_id;
    await this.devicesService.updateStatus(dto.imei, 'online');
    return this.gpsDataModel.create(data);
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
