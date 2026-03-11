import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductionDto {
  @ApiProperty() @IsNotEmpty() @IsString() product: string;
  @ApiProperty() @IsNotEmpty() @IsDateString() production_date: string;
  @ApiProperty() @IsNotEmpty() @IsNumber() quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operator?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
