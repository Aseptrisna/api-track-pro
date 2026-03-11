import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
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
}
