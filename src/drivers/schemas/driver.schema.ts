import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Driver {
  @Prop({ required: true })
  name: string;

  @Prop()
  phone: string;

  @Prop()
  license_number: string;

  @Prop({ enum: ['active', 'inactive', 'on_leave'], default: 'active' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle' })
  assigned_vehicle: Types.ObjectId;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);
