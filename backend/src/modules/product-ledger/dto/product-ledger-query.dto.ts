import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ProductLedgerQueryDto {
  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
