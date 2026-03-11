import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDistributionDto {
  @ApiProperty() @IsNotEmpty() @IsString() product: string;
  @ApiProperty() @IsNotEmpty() @IsNumber() quantity: number;
  @ApiProperty() @IsNotEmpty() @IsString() source_warehouse: string;
  @ApiProperty() @IsNotEmpty() @IsString() destination: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
