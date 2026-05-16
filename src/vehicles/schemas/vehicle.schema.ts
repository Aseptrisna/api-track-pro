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

  @Prop({
    type: Types.ObjectId,
    ref: 'Driver',
    default: null,
    set: (v: any) => (v && Types.isValid(String(v)) ? new Types.ObjectId(String(v)) : null),
  })
  driver: Types.ObjectId | null;

  @Prop({ enum: VehicleStatus, default: VehicleStatus.ACTIVE })
  status: VehicleStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'Device',
    default: null,
    set: (v: any) => (v && Types.isValid(String(v)) ? new Types.ObjectId(String(v)) : null),
  })
  device_id: Types.ObjectId | null;

  @Prop({ default: 80 })
  speed_limit: number;

  // ── Service schedule ──────────────────────────────────────────────────────
  @Prop({ default: 0 })
  odometer: number;

  @Prop()
  last_service_date: Date;

  @Prop()
  last_service_km: number;

  @Prop()
  next_service_date: Date;

  @Prop()
  next_service_km: number;

  @Prop()
  service_notes: string;

  // ── Legal documents ───────────────────────────────────────────────────────
  @Prop()
  stnk_expiry: Date;

  @Prop()
  kir_expiry: Date;

  @Prop()
  insurance_expiry: Date;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
