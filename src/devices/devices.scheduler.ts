import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device } from './schemas/device.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DevicesScheduler {
  private readonly logger = new Logger(DevicesScheduler.name);

  constructor(
    @InjectModel(Device.name) private deviceModel: Model<Device>,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkOfflineDevices(): Promise<void> {
    const threshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    const staleDevices = await this.deviceModel
      .find({ status: 'online', last_seen: { $lt: threshold } })
      .exec();

    if (!staleDevices.length) return;

    this.logger.log(`Marking ${staleDevices.length} device(s) as offline`);

    for (const device of staleDevices) {
      await this.deviceModel.findByIdAndUpdate(device._id, { status: 'offline' });

      if (device.owner) {
        await this.notificationsService.create({
          title: 'Device offline',
          message: `Device "${device.device_name}" (IMEI: ${device.imei}) has gone offline. Last seen: ${device.last_seen?.toLocaleString('id-ID') ?? 'unknown'}.`,
          type: 'warning',
          user: device.owner.toString(),
        });
      }
    }
  }
}
