import { IsOptional, IsString, IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTruckLoadItemDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  loadedQty: number;
}

export class UpdateTruckLoadDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTruckLoadItemDto)
  items?: UpdateTruckLoadItemDto[];
}
