import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: false, versionKey: false, collection: 'vehicle_assignments' })
export class VehicleAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true, index: true })
  vehicle: Types.ObjectId;

  @Prop({ required: true })
  vehicle_name: string;

  @Prop({ required: true })
  plate_number: string;

  @Prop({ type: Types.ObjectId, ref: 'Driver', default: null })
  driver: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  driver_name: string | null;

  @Prop({ type: String, enum: ['assigned', 'unassigned'], required: true })
  event: 'assigned' | 'unassigned';

  @Prop({ required: true, default: () => new Date() })
  occurred_at: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;
}

export const VehicleAssignmentSchema = SchemaFactory.createForClass(VehicleAssignment);
VehicleAssignmentSchema.index({ owner: 1, occurred_at: -1 });
VehicleAssignmentSchema.index({ owner: 1, vehicle: 1, occurred_at: -1 });
VehicleAssignmentSchema.index({ owner: 1, driver: 1, occurred_at: -1 });
