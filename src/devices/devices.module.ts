import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from './schemas/device.schema';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DevicesScheduler } from './devices.scheduler';

@Module({
  imports: [MongooseModule.forFeature([{ name: Device.name, schema: DeviceSchema }])],
  controllers: [DevicesController],
  providers: [DevicesService, DevicesScheduler],
  exports: [DevicesService],
})
export class DevicesModule {}
