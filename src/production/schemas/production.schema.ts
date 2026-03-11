import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true,versionKey: false, collection: 'productions' })
export class Production extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true }) product: Types.ObjectId;
  @Prop({ required: true }) production_date: Date;
  @Prop({ required: true }) quantity: number;
  @Prop() location: string;
  @Prop() operator: string;
  @Prop({ enum: ['planned', 'in_progress', 'completed', 'cancelled'], default: 'planned' }) status: string;
}

export const ProductionSchema = SchemaFactory.createForClass(Production);
