import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle } from './schemas/vehicle.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(@InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>) {}

  async create(dto: CreateVehicleDto, ownerId: string): Promise<Vehicle> {
    return this.vehicleModel.create({ ...dto, owner: new Types.ObjectId(ownerId) });
  }

  // Strip invalid ObjectId refs so Mongoose populate $in doesn't throw a cast error
  // (handles existing DB documents that stored driver/device_id as empty strings)
  private stripInvalidRefs(docs: any[]): void {
    for (const doc of docs) {
      if (doc.driver != null && !Types.isValid(String(doc.driver))) doc.driver = null;
      if (doc.device_id != null && !Types.isValid(String(doc.device_id))) doc.device_id = null;
    }
  }

  async findAll(ownerId: string, page = 1, limit = 10, search?: string, type?: string) {
    const filter: any = { owner: new Types.ObjectId(ownerId) };
    if (search) filter.$or = [
      { vehicle_name: { $regex: search, $options: 'i' } },
      { plate_number: { $regex: search, $options: 'i' } },
    ];
    if (type) filter.vehicle_type = type;
    const skip = (page - 1) * limit;
    const [rawData, total] = await Promise.all([
      this.vehicleModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean().exec(),
      this.vehicleModel.countDocuments(filter),
    ]);
    this.stripInvalidRefs(rawData as any[]);
    const data = await this.vehicleModel.populate(rawData, [{ path: 'driver' }, { path: 'device_id' }]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ownerId: string): Promise<Vehicle> {
    const raw = await this.vehicleModel.findOne({ _id: id, owner: new Types.ObjectId(ownerId) }).lean().exec() as any;
    if (!raw) throw new NotFoundException('Vehicle not found');
    this.stripInvalidRefs([raw]);
    const [v] = await this.vehicleModel.populate([raw], [{ path: 'driver' }, { path: 'device_id' }]) as any[];
    return v;
  }

  async update(id: string, dto: UpdateVehicleDto, ownerId: string): Promise<Vehicle> {
    const v = await this.vehicleModel.findOneAndUpdate({ _id: id, owner: new Types.ObjectId(ownerId) }, dto, { new: true });
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const r = await this.vehicleModel.findOneAndDelete({ _id: id, owner: new Types.ObjectId(ownerId) });
    if (!r) throw new NotFoundException('Vehicle not found');
  }

  async countByOwner(ownerId: string): Promise<number> {
    return this.vehicleModel.countDocuments({ owner: new Types.ObjectId(ownerId) });
  }

  async countByOwnerAndStatus(ownerId: string, status: string): Promise<number> {
    return this.vehicleModel.countDocuments({ owner: new Types.ObjectId(ownerId), status });
  }

  async getAllByOwner(ownerId: string): Promise<Vehicle[]> {
    const rawData = await this.vehicleModel.find({ owner: new Types.ObjectId(ownerId) }).lean().exec();
    this.stripInvalidRefs(rawData as any[]);
    return this.vehicleModel.populate(rawData, [{ path: 'driver' }, { path: 'device_id' }]) as unknown as Vehicle[];
  }

  async getComplianceReport(ownerId: string) {
    const now = new Date();
    const WARNING_DAYS = 30;
    const WARNING_KM  = 1000;

    const vehicles = await this.vehicleModel
      .find({ owner: new Types.ObjectId(ownerId) })
      .sort({ vehicle_name: 1 })
      .lean()
      .exec();

    type DocStatus = 'expired' | 'warning' | 'ok' | 'unknown';

    function docStatus(expiry: Date | null | undefined): {
      status: DocStatus;
      daysLeft: number | null;
      expiry: string | null;
    } {
      if (!expiry) return { status: 'unknown', daysLeft: null, expiry: null };
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
      const status: DocStatus =
        daysLeft < 0 ? 'expired' : daysLeft <= WARNING_DAYS ? 'warning' : 'ok';
      return { status, daysLeft, expiry: expiry.toISOString() };
    }

    return vehicles.map((v: any) => {
      const stnk      = docStatus(v.stnk_expiry      ? new Date(v.stnk_expiry)      : null);
      const kir       = docStatus(v.kir_expiry        ? new Date(v.kir_expiry)        : null);
      const insurance = docStatus(v.insurance_expiry  ? new Date(v.insurance_expiry)  : null);

      let dateStatus: DocStatus = 'unknown';
      let dateDaysLeft: number | null = null;
      if (v.next_service_date) {
        dateDaysLeft = Math.ceil(
          (new Date(v.next_service_date).getTime() - now.getTime()) / 86_400_000,
        );
        dateStatus =
          dateDaysLeft < 0 ? 'expired' : dateDaysLeft <= 7 ? 'warning' : 'ok';
      }

      let kmStatus: DocStatus = 'unknown';
      let kmLeft: number | null = null;
      if (v.next_service_km != null && v.odometer != null) {
        kmLeft = v.next_service_km - v.odometer;
        kmStatus = kmLeft < 0 ? 'expired' : kmLeft <= WARNING_KM ? 'warning' : 'ok';
      }

      const allStatuses: DocStatus[] = [stnk.status, kir.status, insurance.status, dateStatus, kmStatus];
      const overallStatus: DocStatus = allStatuses.includes('expired')
        ? 'expired'
        : allStatuses.includes('warning')
        ? 'warning'
        : allStatuses.every((s) => s === 'unknown')
        ? 'unknown'
        : 'ok';

      return {
        _id:          v._id,
        vehicle_name: v.vehicle_name,
        plate_number: v.plate_number,
        vehicle_type: v.vehicle_type,
        status:       v.status,
        stnk,
        kir,
        insurance,
        service: {
          nextDate:        v.next_service_date ?? null,
          dateStatus,
          dateDaysLeft,
          nextKm:          v.next_service_km  ?? null,
          currentOdometer: v.odometer          ?? 0,
          kmStatus,
          kmLeft,
        },
        overallStatus,
      };
    });
  }

  // Admin: get all vehicles across all users
  async count(): Promise<number> {
    return this.vehicleModel.countDocuments();
  }

  async countByStatus(status: string): Promise<number> {
    return this.vehicleModel.countDocuments({ status });
  }

  async getAll(): Promise<Vehicle[]> {
    const rawData = await this.vehicleModel.find().lean().exec();
    this.stripInvalidRefs(rawData as any[]);
    return this.vehicleModel.populate(rawData, [{ path: 'driver' }, { path: 'device_id' }]) as unknown as Vehicle[];
  }
}
