import {
  IsOptional,
  IsString,
  IsInt,
  IsUUID,
  IsDateString,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Global ValidationPipe нь forbidNonWhitelisted-тэй тул хүсэлтийн талбар бүр
 * энд бүртгэгдсэн байх ёстой — эс бөгөөс 400 буцна.
 *
 * Сонголтыг цуцлахад хоосон мөр ирдэг тул UUID шалгалтыг хоосон үед алгасна.
 */

export class QueryStatementsDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class CalendarQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v !== null)
  @IsUUID()
  customerId?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v !== null)
  @IsUUID()
  expenseCategoryId?: string | null;
}

export class UpdateConfigDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v !== null)
  @IsUUID()
  settlementCustomerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  settlementDescription?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v !== null)
  @IsUUID()
  feeExpenseCategoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  feeDescription?: string;
}

export class PostFeesDto {
  /** Хоосон бол тохиргооны анхдагч ангиллыг ашиглана. */
  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v !== null)
  @IsUUID()
  expenseCategoryId?: string;
}

export class SetBankAccountDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v !== null)
  @IsUUID()
  bankAccountId?: string | null;
}
