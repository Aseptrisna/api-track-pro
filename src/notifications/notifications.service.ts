import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private notificationModel: Model<Notification>) {}

  async create(data: { title: string; message: string; type?: string; user?: string }) {
    return this.notificationModel.create({ ...data, user: data.user ? new Types.ObjectId(data.user) : undefined });
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { user: new Types.ObjectId(userId) };
    const [data, total] = await Promise.all([
      this.notificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.notificationModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markAsRead(id: string) {
    return this.notificationModel.findByIdAndUpdate(id, { read_status: true }, { new: true });
  }

  async markAllAsRead(userId: string) {
    return this.notificationModel.updateMany({ user: new Types.ObjectId(userId), read_status: false }, { read_status: true });
  }

  async delete(id: string) {
    return this.notificationModel.findByIdAndDelete(id);
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationModel.countDocuments({ user: new Types.ObjectId(userId), read_status: false });
    return { count };
  }

  async getAlertStats(userId: string, days = 30): Promise<{
    total: number;
    byType: { type: string; count: number }[];
    dailyTrend: { date: string; count: number }[];
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const uid = new Types.ObjectId(userId);
    const filter = { user: uid, createdAt: { $gte: since } };

    const [total, byType, dailyTrend] = await Promise.all([
      this.notificationModel.countDocuments(filter),

      this.notificationModel.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $project: { type: '$_id', count: 1, _id: 0 } },
      ]),

      this.notificationModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    return { total, byType, dailyTrend };
  }
}
