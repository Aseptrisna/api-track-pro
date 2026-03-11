import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Device {
  @Prop({ required: true, unique: true })
  imei: string;

  @Prop({ required: true })
  device_name: string;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle' })
  vehicle_id: Types.ObjectId;

  @Prop()
  phone_number: string;

  @Prop({ enum: ['online', 'offline'], default: 'offline' })
  status: string;

  @Prop()
  last_seen: Date;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
