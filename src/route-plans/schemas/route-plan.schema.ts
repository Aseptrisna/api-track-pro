import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type RoutePlanStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled';

@Schema({ timestamps: true, versionKey: false, collection: 'route_plans' })
export class RoutePlan {
  @Prop({ required: true }) name: string;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true, index: true })
  vehicle: Types.ObjectId;

  @Prop() vehicle_name: string;
  @Prop() plate_number: string;

  @Prop({ type: Types.ObjectId, ref: 'Driver', default: null })
  driver: Types.ObjectId | null;

  @Prop({ default: '' }) driver_name: string;

  @Prop({ required: true }) planned_date: Date;

  @Prop({ required: true }) origin: string;
  @Prop({ required: true }) destination: string;

  @Prop({ type: [String], default: [] }) waypoints: string[];

  @Prop({ default: 0 }) estimated_distance_km: number;
  @Prop({ default: 0 }) estimated_duration_min: number;

  @Prop({ default: '' }) notes: string;

  @Prop({
    enum: ['planned', 'in-progress', 'completed', 'cancelled'],
    default: 'planned',
  })
  status: RoutePlanStatus;

  @Prop({ type: Date, default: null }) completed_at: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;
}

export const RoutePlanSchema = SchemaFactory.createForClass(RoutePlan);
RoutePlanSchema.index({ owner: 1, planned_date: -1 });
RoutePlanSchema.index({ owner: 1, status: 1 });
RoutePlanSchema.index({ owner: 1, vehicle: 1 });
