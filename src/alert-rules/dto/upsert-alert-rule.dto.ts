import { IsBoolean, IsInt, IsOptional, IsArray, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertAlertRuleDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() speed_alert_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(10) @Max(300) speed_limit_override?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() geofence_enter_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() geofence_exit_enabled?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) monitored_geofences?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(120) cooldown_minutes?: number;
}
