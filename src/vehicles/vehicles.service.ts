import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle } from './schemas/vehicle.schema';
import { Driver } from '../drivers/schemas/driver.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleAssignmentsService } from '../vehicle-assignments/vehicle-assignments.service';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    @InjectModel(Driver.name)  private driverModel:  Model<Driver>,
    private readonly vehicleAssignmentsService: VehicleAssignmentsService,
  ) {}

  async create(dto: CreateVehicleDto, ownerId: string): Promise<Vehicle> {
    return this.vehicleModel.create({ ...dto, owner: new Types.ObjectId(ownerId) });
  }

  // Strip invalid ObjectId refs so Mongoose populate $in doesn't throw a cast error
  // (handles existing DB documents that stored driver/device_id as empty strings)
  private stripInvalidRefs(docs: any[]): void {
    for (const doc of docs) {
      if (doc.driver != null && !Types.ObjectId.isValid(String(doc.driver))) doc.driver = null;
      if (doc.device_id != null && !Types.ObjectId.isValid(String(doc.device_id))) doc.device_id = null;
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
    // Capture current state before mutating (needed for assignment change detection)
    const current = await this.vehicleModel
      .findOne({ _id: id, owner: new Types.ObjectId(ownerId) })
      .lean()
      .exec() as any;
    if (!current) throw new NotFoundException('Vehicle not found');

    const v = await this.vehicleModel.findOneAndUpdate(
      { _id: id, owner: new Types.ObjectId(ownerId) },
      dto,
      { new: true },
    );
    if (!v) throw new NotFoundException('Vehicle not found');

    // Detect and log driver assignment changes (non-blocking)
    if ('driver' in dto) {
      const oldId = current.driver ? String(current.driver) : null;
      const newId = dto.driver     ? String(dto.driver)     : null;
      if (oldId !== newId) {
        this.logDriverChange(current, oldId, newId, ownerId).catch(() => null);
      }
    }

    return v;
  }

  private async logDriverChange(
    vehicle: any,
    oldDriverId: string | null,
    newDriverId: string | null,
    ownerId:     string,
  ): Promise<void> {
    const [oldDriver, newDriver] = await Promise.all([
      oldDriverId ? this.driverModel.findById(oldDriverId).lean().exec() as any : null,
      newDriverId ? this.driverModel.findById(newDriverId).lean().exec() as any : null,
    ]);

    if (oldDriverId) {
      await this.vehicleAssignmentsService.log({
        vehicle:      String(vehicle._id),
        vehicle_name: vehicle.vehicle_name,
        plate_number: vehicle.plate_number,
        driver:       oldDriverId,
        driver_name:  (oldDriver as any)?.name ?? null,
        event:        'unassigned',
        owner:        ownerId,
      });
    }
    if (newDriverId) {
      await this.vehicleAssignmentsService.log({
        vehicle:      String(vehicle._id),
        vehicle_name: vehicle.vehicle_name,
        plate_number: vehicle.plate_number,
        driver:       newDriverId,
        driver_name:  (newDriver as any)?.name ?? null,
        event:        'assigned',
        owner:        ownerId,
      });
    }
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

  // ── Maintenance Calendar ──────────────────────────────────────────────────────
  async getCalendar(ownerId: string) {
    const vehicles = await this.vehicleModel
      .find({ owner: new Types.ObjectId(ownerId) })
      .select('vehicle_name plate_number next_service_date stnk_expiry kir_expiry insurance_expiry')
      .lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    type EventStatus = 'overdue' | 'due-soon' | 'upcoming' | 'ok';
    type EventType   = 'service' | 'stnk' | 'kir' | 'insurance';

    const events: {
      date:         string;
      type:         EventType;
      label:        string;
      vehicleId:    string;
      vehicle_name: string;
      plate_number: string;
      status:       EventStatus;
      daysUntil:    number;
    }[] = [];

    const DEFS: { field: string; type: EventType; label: string }[] = [
      { field: 'next_service_date', type: 'service',   label: 'Service Due'        },
      { field: 'stnk_expiry',       type: 'stnk',      label: 'STNK Expiry'        },
      { field: 'kir_expiry',        type: 'kir',        label: 'KIR / Uji Berkala' },
      { field: 'insurance_expiry',  type: 'insurance',  label: 'Insurance Expiry'  },
    ];

    for (const v of vehicles) {
      for (const def of DEFS) {
        const raw = (v as any)[def.field] as Date | undefined;
        if (!raw) continue;

        const d = new Date(raw);
        d.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((d.getTime() - today.getTime()) / 86_400_000);

        let status: EventStatus;
        if (daysUntil < 0)        status = 'overdue';
        else if (daysUntil <= 14) status = 'due-soon';
        else if (daysUntil <= 60) status = 'upcoming';
        else                      status = 'ok';

        events.push({
          date:         d.toISOString().split('T')[0],
          type:         def.type,
          label:        def.label,
          vehicleId:    String(v._id),
          vehicle_name: v.vehicle_name,
          plate_number: v.plate_number,
          status,
          daysUntil,
        });
      }
    }

    events.sort((a, b) => a.daysUntil - b.daysUntil);
    return { events };
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
