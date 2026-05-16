import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

@Schema({ timestamps: true,versionKey: false })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ enum: UserRole, default: UserRole.OPERATOR })
  role: UserRole;

  @Prop()
  phone: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerificationToken: string;

  @Prop()
  passwordResetToken: string;

  @Prop()
  passwordResetExpires: Date;

  @Prop({ default: true })
  isActive: boolean;

  /** Set for team members — points to the fleet owner's _id */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  owner_ref: Types.ObjectId | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
