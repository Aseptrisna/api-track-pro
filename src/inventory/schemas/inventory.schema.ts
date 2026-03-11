import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true,versionKey: false, collection: 'inventories' })
export class Inventory extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true }) product: Types.ObjectId;
  @Prop({ required: true }) warehouse: string;
  @Prop({ default: 0 }) stock: number;
  @Prop({ default: 0 }) minimum_stock: number;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
