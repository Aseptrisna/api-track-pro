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

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ user: new Types.ObjectId(userId), read_status: false });
  }
}
