import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog } from './schemas/activity-log.schema';

export interface FindLogsOptions {
  page?: number;
  limit?: number;
  userId?: string;
  module?: string;
  action?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class ActivityLogService {
  constructor(@InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLog>) {}

  async log(userId: string, action: string, module: string, details?: string) {
    return this.activityLogModel.create({
      user: new Types.ObjectId(userId),
      action,
      module,
      details,
    }).catch(() => null); // never throw — logging must not break business logic
  }

  async findAll(options: FindLogsOptions = {}) {
    const { page = 1, limit = 20, userId, module, action, from, to } = options;
    const filter: any = {};

    if (userId) filter.user = new Types.ObjectId(userId);
    if (module) filter.module = module;
    if (action) filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.activityLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .exec(),
      this.activityLogModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getModules(userId: string): Promise<string[]> {
    const result = await this.activityLogModel.distinct('module', {
      user: new Types.ObjectId(userId),
    });
    return result as string[];
  }
}
