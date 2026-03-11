import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog } from './schemas/activity-log.schema';

@Injectable()
export class ActivityLogService {
  constructor(@InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLog>) {}

  async log(userId: string, action: string, module: string, details?: string) {
    return this.activityLogModel.create({
      user: new Types.ObjectId(userId),
      action,
      module,
      details,
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.activityLogModel.find().sort({ timestamp: -1 }).skip(skip).limit(limit).populate('user', 'name email').exec(),
      this.activityLogModel.countDocuments(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
