import { IsUUID, IsNotEmpty, IsOptional, IsString, IsDateString, IsArray, ValidateNested, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TruckLoadLocation } from '@prisma/client';

export class TruckLoadItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  loadedQty: number;
}

export class CreateTruckLoadDto {
  @IsUUID()
  @IsNotEmpty()
  driverId: string;

  @IsDateString()
  loadDate: string;

  @IsOptional()
  @IsEnum(TruckLoadLocation)
  locationType?: TruckLoadLocation;  // URBAN (Мөрөн) | RURAL (Орон нутаг)

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  vehicleInfo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TruckLoadItemDto)
  items: TruckLoadItemDto[];
}
