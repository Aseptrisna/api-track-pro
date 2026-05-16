import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class AlertRule extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true })
  vehicle: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;

  /** Set false to silence ALL speed notifications for this vehicle */
  @Prop({ default: true })
  speed_alert_enabled: boolean;

  /**
   * Override the vehicle's speed_limit just for notifications.
   * null = use vehicle.speed_limit as-is.
   */
  @Prop({ type: Number, default: null })
  speed_limit_override: number | null;

  /** Notify when vehicle enters a geofence */
  @Prop({ default: true })
  geofence_enter_enabled: boolean;

  /** Notify when vehicle exits a geofence */
  @Prop({ default: true })
  geofence_exit_enabled: boolean;

  /**
   * Restrict geofence alerts to these specific fences.
   * Empty array = monitor ALL geofences.
   */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Geofence' }], default: [] })
  monitored_geofences: Types.ObjectId[];

  /** Minimum minutes between two speed-alert notifications for this vehicle */
  @Prop({ default: 10, min: 1, max: 120 })
  cooldown_minutes: number;
}

export const AlertRuleSchema = SchemaFactory.createForClass(AlertRule);
AlertRuleSchema.index({ owner: 1, vehicle: 1 }, { unique: true });
