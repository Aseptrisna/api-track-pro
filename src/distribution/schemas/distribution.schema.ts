import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'distributions' })
export class Distribution extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true }) product: Types.ObjectId;
  @Prop({ required: true }) quantity: number;
  @Prop({ required: true }) source_warehouse: string;
  @Prop({ required: true }) destination: string;
  @Prop({ enum: ['pending', 'in_transit', 'delivered', 'cancelled'], default: 'pending' }) status: string;
}

export const DistributionSchema = SchemaFactory.createForClass(Distribution);
