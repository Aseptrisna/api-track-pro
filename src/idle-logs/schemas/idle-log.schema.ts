import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: false, versionKey: false, collection: 'idle_logs' })
export class IdleLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Vehicle', default: null, index: true })
  vehicle_id: Types.ObjectId | null;

  @Prop({ required: true, index: true })
  imei: string;

  @Prop({ required: true })
  start_time: Date;

  @Prop({ required: true })
  end_time: Date;

  @Prop({ required: true })
  duration_minutes: number;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;
}

export const IdleLogSchema = SchemaFactory.createForClass(IdleLog);
IdleLogSchema.index({ owner: 1, start_time: -1 });
IdleLogSchema.index({ owner: 1, vehicle_id: 1, start_time: -1 });
