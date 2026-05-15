import {
  IsDateString, IsEnum, IsMongoId, IsNotEmpty,
  IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TYPES = [
  'routine_service', 'oil_change', 'tire_change', 'brake_service',
  'engine_repair', 'electrical', 'body_repair', 'ac_service', 'other',
] as const;

export class CreateMaintenanceRecordDto {
  @ApiProperty()  @IsMongoId() @IsNotEmpty()  vehicle: string;

  @ApiProperty()  @IsDateString()              date: string;

  @ApiProperty({ enum: TYPES })
  @IsEnum(TYPES)
  type: (typeof TYPES)[number];

  @ApiProperty()  @IsString() @IsNotEmpty()   description: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)    cost?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()             workshop?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)    odometer_at_service?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()             notes?: string;
}
