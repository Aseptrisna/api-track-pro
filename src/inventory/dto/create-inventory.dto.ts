import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty() @IsNotEmpty() @IsString() product: string;
  @ApiProperty() @IsNotEmpty() @IsString() warehouse: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minimum_stock?: number;
}
