import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle } from './schemas/vehicle.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VehiclesScheduler {
  private readonly logger = new Logger(VehiclesScheduler.name);

  constructor(
    @InjectModel(Vehicle.name) private readonly vehicleModel: Model<Vehicle>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Runs once every day at 08:00 */
  @Cron('0 8 * * *')
  async checkServiceDue(): Promise<void> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find vehicles whose next_service_date falls within the next 7 days
    // (and hasn't been passed yet — or is already overdue)
    const vehicles = await this.vehicleModel.find({
      owner: { $exists: true },
      $or: [
        // Date-based: due in ≤ 7 days (includes overdue)
        { next_service_date: { $lte: in7Days } },
        // Km-based: ≤ 1000 km remaining
        { $expr: { $lte: [{ $subtract: ['$next_service_km', '$odometer'] }, 1000] } },
      ],
    }).exec();

    for (const vehicle of vehicles) {
      const ownerId = vehicle.owner.toString();

      // Date-based alert
      if (vehicle.next_service_date) {
        const dueDate = new Date(vehicle.next_service_date);
        const isOverdue = dueDate < now;
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const title = isOverdue
          ? `Service overdue: ${vehicle.vehicle_name}`
          : `Service due soon: ${vehicle.vehicle_name}`;

        const message = isOverdue
          ? `Vehicle "${vehicle.vehicle_name}" (${vehicle.plate_number}) service was due on ${dueDate.toLocaleDateString('id-ID')}.`
          : `Vehicle "${vehicle.vehicle_name}" (${vehicle.plate_number}) is due for service in ${daysLeft} day(s) (${dueDate.toLocaleDateString('id-ID')}).`;

        await this.notificationsService.create({
          title,
          message,
          type: isOverdue ? 'alert' : 'warning',
          user: ownerId,
        }).catch(() => {});
      }

      // Km-based alert
      if (vehicle.next_service_km != null && vehicle.odometer != null) {
        const remaining = vehicle.next_service_km - vehicle.odometer;
        if (remaining <= 1000) {
          const isOverdue = remaining <= 0;
          const title = isOverdue
            ? `Service overdue: ${vehicle.vehicle_name}`
            : `Service due soon: ${vehicle.vehicle_name}`;

          const message = isOverdue
            ? `Vehicle "${vehicle.vehicle_name}" (${vehicle.plate_number}) exceeded service interval by ${Math.abs(remaining).toLocaleString()} km.`
            : `Vehicle "${vehicle.vehicle_name}" (${vehicle.plate_number}) needs service in ${remaining.toLocaleString()} km (at ${vehicle.next_service_km.toLocaleString()} km).`;

          await this.notificationsService.create({
            title,
            message,
            type: isOverdue ? 'alert' : 'warning',
            user: ownerId,
          }).catch(() => {});
        }
      }
    }

    this.logger.log(`Service due check complete — checked ${vehicles.length} vehicle(s)`);
  }

  /** Runs daily at 08:15 — checks STNK, KIR, insurance expiry */
  @Cron('15 8 * * *')
  async checkDocumentExpiry(): Promise<void> {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const docFields: { field: keyof Vehicle; label: string }[] = [
      { field: 'stnk_expiry',      label: 'STNK' },
      { field: 'kir_expiry',       label: 'KIR' },
      { field: 'insurance_expiry', label: 'Asuransi' },
    ];

    for (const { field, label } of docFields) {
      const vehicles = await this.vehicleModel.find({
        owner: { $exists: true },
        [field]: { $exists: true, $ne: null, $lte: in30Days },
      }).exec();

      for (const vehicle of vehicles) {
        const expiryDate = new Date((vehicle as any)[field]);
        const isExpired = expiryDate < now;
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const ownerId = vehicle.owner.toString();

        const title = isExpired
          ? `${label} kadaluarsa: ${vehicle.vehicle_name}`
          : `${label} akan kadaluarsa: ${vehicle.vehicle_name}`;

        const message = isExpired
          ? `${label} kendaraan "${vehicle.vehicle_name}" (${vehicle.plate_number}) sudah kadaluarsa pada ${expiryDate.toLocaleDateString('id-ID')}.`
          : `${label} kendaraan "${vehicle.vehicle_name}" (${vehicle.plate_number}) akan kadaluarsa dalam ${daysLeft} hari (${expiryDate.toLocaleDateString('id-ID')}).`;

        await this.notificationsService.create({
          title,
          message,
          type: isExpired ? 'alert' : 'warning',
          user: ownerId,
        }).catch(() => {});
      }
    }

    this.logger.log('Document expiry check complete');
  }
}
