import { IsOptional, IsUUID, IsBoolean, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryProductDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsIn(['name', 'sellingPrice', 'createdAt', 'stockAvailable'])
  sortBy?: string = 'createdAt';
}
