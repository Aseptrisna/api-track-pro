import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum VehicleType {
  BUS = 'bus',
  MOTORCYCLE = 'motorcycle',
  TRUCK = 'truck',
  CAR = 'car',
  PERSONAL_CAR = 'personal_car',
  RENTAL_VEHICLE = 'rental_vehicle',
  GARBAGE_TRUCK = 'garbage_truck',
  DELIVERY_VEHICLE = 'delivery_vehicle',
  GOVERNMENT_VEHICLE = 'government_vehicle',
  OTHER = 'other',
}

export enum VehicleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

@Schema({ timestamps: true , versionKey: false})
export class Vehicle {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;

  @Prop({ required: true })
  vehicle_name: string;

  @Prop({ required: true, enum: VehicleType })
  vehicle_type: VehicleType;

  @Prop({ required: true, unique: true })
  plate_number: string;

  @Prop()
  brand: string;

  @Prop()
  model: string;

  @Prop()
  year: number;

  @Prop({ type: Types.ObjectId, ref: 'Driver' })
  driver: Types.ObjectId;

  @Prop({ enum: VehicleStatus, default: VehicleStatus.ACTIVE })
  status: VehicleStatus;

  @Prop({ type: Types.ObjectId, ref: 'Device' })
  device_id: Types.ObjectId;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
