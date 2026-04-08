import { IsUUID, IsNotEmpty, IsOptional, IsString, IsDateString, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
