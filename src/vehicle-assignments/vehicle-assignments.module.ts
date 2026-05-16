import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleAssignment, VehicleAssignmentSchema } from './schemas/vehicle-assignment.schema';
import { VehicleAssignmentsService } from './vehicle-assignments.service';
import { VehicleAssignmentsController } from './vehicle-assignments.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VehicleAssignment.name, schema: VehicleAssignmentSchema },
    ]),
  ],
  controllers: [VehicleAssignmentsController],
  providers:   [VehicleAssignmentsService],
  exports:     [VehicleAssignmentsService],
})
export class VehicleAssignmentsModule {}
