import { IsOptional, IsUUID, IsEnum, IsDateString, ValidateIf } from 'class-validator';
import { PaymentMethod, PaymentStatus, CustomerPaymentType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Төлбөрийн жагсаалтын шүүлтүүр.
 *
 * Global ValidationPipe нь forbidNonWhitelisted-тэй тул шүүлтийн талбар бүр
 * энд бүртгэгдсэн байх ёстой — эс бөгөөс хүсэлт 400 буцна.
 */
export class QueryPaymentDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsEnum(CustomerPaymentType)
  type?: CustomerPaymentType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  /** Дансны ID, эсвэл "none" = данс сонгоогүй төлбөрүүд. */
  @IsOptional()
  @ValidateIf((_, value) => value !== 'none')
  @IsUUID()
  bankAccountId?: string;
}
