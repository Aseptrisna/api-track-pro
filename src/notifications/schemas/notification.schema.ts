import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Notification extends Document {
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) message: string;
  @Prop({ enum: ['alert', 'info', 'warning', 'success'], default: 'info' }) type: string;
  @Prop({ type: Types.ObjectId, ref: 'User' }) user: Types.ObjectId;
  @Prop({ default: false }) read_status: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
