import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false, collection: 'speed_violations' })
export class Violation extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Vehicle' })
  vehicle: Types.ObjectId;

  @Prop({ required: true })
  imei: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  speed: number;

  @Prop({ required: true })
  speed_limit: number;

  @Prop({ required: true })
  excess: number;

  @Prop({ enum: ['mild', 'moderate', 'severe'], required: true })
  severity: string;

  @Prop()
  latitude: number;

  @Prop()
  longitude: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;
}

export const ViolationSchema = SchemaFactory.createForClass(Violation);
ViolationSchema.index({ owner: 1, timestamp: -1 });
ViolationSchema.index({ vehicle: 1, timestamp: -1 });
