import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VehicleAssignmentsService } from './vehicle-assignments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Vehicle Assignments')
@ApiBearerAuth()
@Controller('vehicle-assignments')
export class VehicleAssignmentsController {
  constructor(private readonly service: VehicleAssignmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get vehicle assignment history' })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'driverId',  required: false })
  @ApiQuery({ name: 'page',      required: false })
  @ApiQuery({ name: 'limit',     required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('vehicleId') vehicleId?: string,
    @Query('driverId')  driverId?:  string,
    @Query('page')      page?:      string,
    @Query('limit')     limit?:     string,
  ) {
    return this.service.findAll(
      user.userId,
      vehicleId,
      driverId,
      Number(page)  || 1,
      Number(limit) || 20,
    );
  }
}
