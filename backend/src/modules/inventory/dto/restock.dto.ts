import {
  IsString,
  IsInt,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

class RestockItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;
}

export class RestockDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestockItemDto)
  items: RestockItemDto[];

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AdjustStockDto {
  @IsUUID()
  productId: string;

  @IsInt()
  adjustment: number; // positive or negative

  @IsString()
  reason: string;
}
