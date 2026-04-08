import { IsDateString, IsOptional, IsString, IsArray, ValidateNested, IsInt, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CountItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  countedQty: number;
}

export class CreateInventoryCountDto {
  @IsDateString()
  countDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCountItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountItemDto)
  items: CountItemDto[];
}
