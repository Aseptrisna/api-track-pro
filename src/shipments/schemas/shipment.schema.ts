import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Shipment extends Document {
  @Prop({ required: true, unique: true })
  shipment_code: string;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle' })
  vehicle: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Driver' })
  driver: Types.ObjectId;

  @Prop({ required: true })
  origin: string;

  @Prop({ required: true })
  destination: string;

  @Prop()
  product: string;

  @Prop()
  quantity: number;

  @Prop()
  departure_time: Date;

  @Prop()
  arrival_time: Date;

  @Prop({ enum: ['pending', 'in_transit', 'delivered', 'cancelled'], default: 'pending' })
  status: string;
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);
