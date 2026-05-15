import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class FuelLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true })
  vehicle: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  created_by: Types.ObjectId;

  /** Date of the fill-up */
  @Prop({ required: true })
  date: Date;

  /** Liters filled */
  @Prop({ required: true })
  liters: number;

  /** Price per liter (IDR) */
  @Prop({ required: true })
  cost_per_liter: number;

  /** Odometer reading at time of fill (km) */
  @Prop()
  odometer_at_fill?: number;

  /** Fuel station name */
  @Prop()
  station_name?: string;

  @Prop()
  notes?: string;
}

export const FuelLogSchema = SchemaFactory.createForClass(FuelLog);
