import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type IncidentType     = 'accident' | 'breakdown' | 'theft' | 'vandalism' | 'other';
export type IncidentSeverity = 'minor' | 'moderate' | 'severe';
export type IncidentStatus   = 'open' | 'in-progress' | 'resolved';

@Schema({ timestamps: true, versionKey: false, collection: 'incidents' })
export class Incident {
  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true, index: true })
  vehicle: Types.ObjectId;

  @Prop() vehicle_name: string;
  @Prop() plate_number: string;

  @Prop({ type: Types.ObjectId, ref: 'Driver', default: null })
  driver: Types.ObjectId | null;

  @Prop({ default: '' }) driver_name: string;

  @Prop({ required: true }) date: Date;

  @Prop({
    required: true,
    enum: ['accident', 'breakdown', 'theft', 'vandalism', 'other'],
  })
  type: IncidentType;

  @Prop({ required: true, enum: ['minor', 'moderate', 'severe'] })
  severity: IncidentSeverity;

  @Prop({ required: true }) description: string;
  @Prop({ default: '' }) location: string;

  @Prop({ default: 0 }) damage_cost: number;
  @Prop({ default: '' }) insurance_claim_ref: string;
  @Prop({ default: 0 }) repair_cost: number;

  @Prop({ enum: ['open', 'in-progress', 'resolved'], default: 'open' })
  status: IncidentStatus;

  @Prop({ default: null }) resolved_at: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;
}

export const IncidentSchema = SchemaFactory.createForClass(Incident);
IncidentSchema.index({ owner: 1, date: -1 });
IncidentSchema.index({ owner: 1, vehicle: 1 });
IncidentSchema.index({ owner: 1, status: 1 });
