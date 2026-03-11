import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeviceDto {
  @ApiProperty() @IsNotEmpty() @IsString() imei: string;
  @ApiProperty() @IsNotEmpty() @IsString() device_name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicle_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone_number?: string;
}
