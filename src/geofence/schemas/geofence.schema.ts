import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true,versionKey: false, collection: 'geofences' })
export class Geofence extends Document {
  @Prop({ required: true }) name: string;
  @Prop({ type: [[Number]], required: true }) polygon_coordinates: number[][];
  @Prop({ enum: ['restricted', 'operational', 'delivery_zone'], default: 'operational' }) type: string;
}

export const GeofenceSchema = SchemaFactory.createForClass(Geofence);
