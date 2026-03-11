import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiProperty() @IsNotEmpty() @IsString() shipment_code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driver?: string;
  @ApiProperty() @IsNotEmpty() @IsString() origin: string;
  @ApiProperty() @IsNotEmpty() @IsString() destination: string;
  @ApiPropertyOptional() @IsOptional() @IsString() product?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() departure_time?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() arrival_time?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
