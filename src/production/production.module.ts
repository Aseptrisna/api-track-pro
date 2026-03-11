import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Production, ProductionSchema } from './schemas/production.schema';
import { ProductionService } from './production.service';
import { ProductionController } from './production.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Production.name, schema: ProductionSchema }])],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
