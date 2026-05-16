import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VehicleAssignment } from './schemas/vehicle-assignment.schema';

export interface LogAssignmentDto {
  vehicle:      string;
  vehicle_name: string;
  plate_number: string;
  driver?:      string | null;
  driver_name?: string | null;
  event:        'assigned' | 'unassigned';
  owner:        string;
}

@Injectable()
export class VehicleAssignmentsService {
  constructor(
    @InjectModel(VehicleAssignment.name)
    private readonly model: Model<VehicleAssignment>,
  ) {}

  async log(dto: LogAssignmentDto): Promise<void> {
    await this.model.create({
      vehicle:      new Types.ObjectId(dto.vehicle),
      vehicle_name: dto.vehicle_name,
      plate_number: dto.plate_number,
      driver:       dto.driver ? new Types.ObjectId(dto.driver) : null,
      driver_name:  dto.driver_name ?? null,
      event:        dto.event,
      occurred_at:  new Date(),
      owner:        new Types.ObjectId(dto.owner),
    });
  }

  async findAll(
    ownerId:   string,
    vehicleId?: string,
    driverId?:  string,
    page  = 1,
    limit = 20,
  ) {
    const filter: any = { owner: new Types.ObjectId(ownerId) };
    if (vehicleId) filter.vehicle = new Types.ObjectId(vehicleId);
    if (driverId)  filter.driver  = new Types.ObjectId(driverId);

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ occurred_at: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
