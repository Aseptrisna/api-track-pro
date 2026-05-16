import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExpenseDocument = Expense & Document;

export type ExpenseCategory =
  | 'toll'
  | 'parking'
  | 'fine'
  | 'wash'
  | 'admin'
  | 'insurance'
  | 'other';

@Schema({ timestamps: true, collection: 'custom_expenses', versionKey: false })
export class Expense {
  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true, index: true })
  vehicle: Types.ObjectId;

  @Prop() vehicle_name: string;
  @Prop() plate_number: string;

  @Prop({
    required: true,
    enum: ['toll', 'parking', 'fine', 'wash', 'admin', 'insurance', 'other'],
  })
  category: ExpenseCategory;

  @Prop({ required: true, min: 0 }) amount: number;
  @Prop({ required: true }) date: Date;
  @Prop({ default: '' }) description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
ExpenseSchema.index({ owner: 1, date: -1 });
ExpenseSchema.index({ owner: 1, vehicle: 1 });
ExpenseSchema.index({ owner: 1, category: 1 });
