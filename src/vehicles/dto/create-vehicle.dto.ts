import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType, VehicleStatus } from '../schemas/vehicle.schema';

export class CreateVehicleDto {
  @ApiProperty() @IsNotEmpty() @IsString() vehicle_name: string;
  @ApiProperty({ enum: VehicleType }) @IsEnum(VehicleType) vehicle_type: VehicleType;
  @ApiProperty() @IsNotEmpty() @IsString() plate_number: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() driver?: string;
  @ApiPropertyOptional({ enum: VehicleStatus }) @IsOptional() @IsEnum(VehicleStatus) status?: VehicleStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() device_id?: string;
  @ApiPropertyOptional({ description: 'Speed limit in km/h', default: 80 }) @IsOptional() @IsNumber() speed_limit?: number;

  // Service schedule
  @ApiPropertyOptional({ description: 'Current odometer reading in km' }) @IsOptional() @IsNumber() odometer?: number;
  @ApiPropertyOptional({ description: 'Date of last service' }) @IsOptional() @IsDateString() last_service_date?: string;
  @ApiPropertyOptional({ description: 'Odometer at last service' }) @IsOptional() @IsNumber() last_service_km?: number;
  @ApiPropertyOptional({ description: 'Scheduled next service date' }) @IsOptional() @IsDateString() next_service_date?: string;
  @ApiPropertyOptional({ description: 'Odometer threshold for next service' }) @IsOptional() @IsNumber() next_service_km?: number;
  @ApiPropertyOptional({ description: 'Service notes' }) @IsOptional() @IsString() service_notes?: string;
}
