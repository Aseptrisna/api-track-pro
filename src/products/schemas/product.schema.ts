import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Product extends Document {
  @Prop({ required: true }) name: string;
  @Prop() category: string;
  @Prop() description: string;
  @Prop() unit: string;
  @Prop() price: number;
  @Prop({ enum: ['active', 'inactive'], default: 'active' }) status: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
