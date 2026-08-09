import { IsOptional, IsUUID, IsDateString, IsIn, ValidateIf } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Зардлын жагсаалтын шүүлтүүр.
 *
 * Global ValidationPipe нь forbidNonWhitelisted-тэй тул шүүлтийн талбар бүр
 * энд бүртгэгдсэн байх ёстой — эс бөгөөс хүсэлт 400 буцна.
 */
export class QueryExpenseDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Дансны ID, эсвэл "none" = данс сонгоогүй зардлууд. */
  @IsOptional()
  @ValidateIf((_, value) => value !== 'none')
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsIn(['date', 'amount', 'createdAt'])
  sortBy?: string = 'date';
}
