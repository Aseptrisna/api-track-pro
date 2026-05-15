import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFuelLogDto {
  @ApiProperty()  @IsMongoId()  @IsNotEmpty()  vehicle: string;

  @ApiProperty()  @IsDateString()               date: string;

  @ApiProperty()  @IsNumber() @Min(0.01)        liters: number;

  @ApiProperty()  @IsNumber() @Min(0)            cost_per_liter: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)  odometer_at_fill?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()           station_name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()           notes?: string;
}
