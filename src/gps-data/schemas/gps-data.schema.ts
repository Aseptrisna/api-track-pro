import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false,collection: 'gps_data' })
export class GpsData {
  @Prop({ required: true, index: true })
  imei: string;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle' })
  vehicle_id: Types.ObjectId;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ default: 0 })
  speed: number;

  @Prop({ default: 0 })
  course: number;

  @Prop({ default: 0 })
  altitude: number;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ type: Object })
  raw_data: any;
}

export const GpsDataSchema = SchemaFactory.createForClass(GpsData);
GpsDataSchema.index({ imei: 1, timestamp: -1 });
