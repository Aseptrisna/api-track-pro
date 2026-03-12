import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGpsDataDto {
  @ApiProperty() @IsNotEmpty() @IsString() imei: string;
  @ApiProperty() @IsNumber() latitude: number;
  @ApiProperty() @IsNumber() longitude: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() speed?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() course?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() altitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() timestamp?: string;
  @ApiPropertyOptional() @IsOptional() raw_data?: any;
}
