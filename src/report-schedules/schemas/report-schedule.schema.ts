import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportType = 'fleet_summary' | 'violations' | 'idle_time';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

@Schema({ timestamps: true, versionKey: false, collection: 'report_schedules' })
export class ReportSchedule extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: ['fleet_summary', 'violations', 'idle_time'], required: true })
  report_type: ReportType;

  @Prop({ type: String, enum: ['daily', 'weekly', 'monthly'], required: true })
  frequency: ReportFrequency;

  @Prop({ required: true })
  recipient_email: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ type: Date, default: null })
  last_sent_at: Date | null;
}

export const ReportScheduleSchema = SchemaFactory.createForClass(ReportSchedule);
