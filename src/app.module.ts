import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DevicesModule } from './devices/devices.module';
import { GpsDataModule } from './gps-data/gps-data.module';
import { TrackingModule } from './tracking/tracking.module';
import { DriversModule } from './drivers/drivers.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProductionModule } from './production/production.module';
import { DistributionModule } from './distribution/distribution.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { MailModule } from './mail/mail.module';
import { GeofenceModule } from './geofence/geofence.module';
import { ActivityLogModule } from './activity-log/activity-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/fleet_monitoring'),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    UsersModule,
    VehiclesModule,
    DevicesModule,
    GpsDataModule,
    TrackingModule,
    DriversModule,
    ShipmentsModule,
    ProductsModule,
    InventoryModule,
    ProductionModule,
    DistributionModule,
    DashboardModule,
    NotificationsModule,
    ReportsModule,
    MailModule,
    GeofenceModule,
    ActivityLogModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
