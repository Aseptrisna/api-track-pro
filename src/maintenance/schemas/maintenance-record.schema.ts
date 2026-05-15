import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MaintenanceType =
  | 'routine_service'
  | 'oil_change'
  | 'tire_change'
  | 'brake_service'
  | 'engine_repair'
  | 'electrical'
  | 'body_repair'
  | 'ac_service'
  | 'other';

@Schema({ timestamps: true, versionKey: false })
export class MaintenanceRecord extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true })
  vehicle: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  created_by: Types.ObjectId;

  /** Date the maintenance was performed */
  @Prop({ required: true })
  date: Date;

  @Prop({
    enum: [
      'routine_service', 'oil_change', 'tire_change', 'brake_service',
      'engine_repair', 'electrical', 'body_repair', 'ac_service', 'other',
    ],
    default: 'routine_service',
  })
  type: MaintenanceType;

  @Prop({ required: true })
  description: string;

  /** Total cost in IDR */
  @Prop({ default: 0 })
  cost: number;

  /** Workshop or mechanic name */
  @Prop()
  workshop?: string;

  /** Odometer reading at time of service (km) */
  @Prop()
  odometer_at_service?: number;

  @Prop()
  notes?: string;
}

export const MaintenanceRecordSchema = SchemaFactory.createForClass(MaintenanceRecord);
