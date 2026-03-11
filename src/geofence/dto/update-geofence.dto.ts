import { PartialType } from '@nestjs/mapped-types';
import { CreateGeofenceDto } from './create-geofence.dto';
export class UpdateGeofenceDto extends PartialType(CreateGeofenceDto) {}
