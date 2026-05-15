import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Driver } from './schemas/driver.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { VehiclesService } from '../vehicles/vehicles.service';

@Injectable()
export class DriversScheduler {
  private readonly logger = new Logger(DriversScheduler.name);

  constructor(
    @InjectModel(Driver.name) private readonly driverModel: Model<Driver>,
    private readonly notificationsService: NotificationsService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  /** Runs daily at 08:30 */
  @Cron('30 8 * * *')
  async checkLicenseExpiry(): Promise<void> {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Find drivers with expiring or expired licenses
    const drivers = await this.driverModel.find({
      license_expiry_date: { $exists: true, $ne: null, $lte: in30Days },
    }).populate('assigned_vehicle').exec();

    for (const driver of drivers) {
      const expiryDate = new Date(driver.license_expiry_date!);
      const isExpired = expiryDate < now;
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Find which vehicle owner to notify via assigned_vehicle
      const vehicle = driver.assigned_vehicle as any;
      if (!vehicle?.owner) continue;

      const ownerId = vehicle.owner.toString();

      const title = isExpired
        ? `Driver license expired: ${driver.name}`
        : `Driver license expiring soon: ${driver.name}`;

      const message = isExpired
        ? `Driver "${driver.name}" (SIM: ${driver.license_number || 'N/A'}) license expired on ${expiryDate.toLocaleDateString('id-ID')}.`
        : `Driver "${driver.name}" (SIM: ${driver.license_number || 'N/A'}) license expires in ${daysLeft} day(s) on ${expiryDate.toLocaleDateString('id-ID')}.`;

      await this.notificationsService.create({
        title,
        message,
        type: isExpired ? 'alert' : 'warning',
        user: ownerId,
      }).catch(() => {});
    }

    this.logger.log(`License expiry check done — checked ${drivers.length} driver(s)`);
  }
}
