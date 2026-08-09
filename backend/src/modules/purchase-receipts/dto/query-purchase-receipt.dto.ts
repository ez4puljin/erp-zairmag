import { IsOptional, IsUUID, IsDateString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Орлогын баримтын шүүлтүүр.
 *
 * Global ValidationPipe нь forbidNonWhitelisted-тэй тул шүүлтийн талбар бүр
 * энд бүртгэгдсэн байх ёстой — эс бөгөөс хүсэлт 400 буцна.
 */
export class QueryPurchaseReceiptDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  /** Тухайн барааг агуулсан баримтуудыг шүүнэ. */
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
