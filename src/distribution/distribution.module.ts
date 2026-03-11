import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Distribution, DistributionSchema } from './schemas/distribution.schema';
import { DistributionService } from './distribution.service';
import { DistributionController } from './distribution.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Distribution.name, schema: DistributionSchema }])],
  controllers: [DistributionController],
  providers: [DistributionService],
  exports: [DistributionService],
})
export class DistributionModule {}
