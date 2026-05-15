import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Violation, ViolationSchema } from './schemas/violation.schema';
import { ViolationsService } from './violations.service';
import { ViolationsController } from './violations.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Violation.name, schema: ViolationSchema }]),
  ],
  providers: [ViolationsService],
  controllers: [ViolationsController],
  exports: [ViolationsService],
})
export class ViolationsModule {}
