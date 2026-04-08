import { IsArray, ValidateNested, IsUUID, IsInt, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnItemDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  returnedQty: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  damagedQty?: number;
}

export class SubmitReturnDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
