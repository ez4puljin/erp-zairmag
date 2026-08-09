import {
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Global ValidationPipe нь forbidNonWhitelisted-тэй тул хүсэлтийн талбар бүр
 * энд бүртгэгдсэн байх ёстой — эс бөгөөс 400 буцна.
 */

/** Гүйлгээнд сонгож болох үйлдлүүд. */
export const TXN_ACTIONS = ['', 'close', 'create', 'close_create'] as const;

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
  @MaxLength(200)
  partnerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  partnerCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  partnerAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customDescription?: string;

  @IsOptional()
  @IsIn(TXN_ACTIONS)
  action?: string;
}

export class UpdateConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  settlementPartnerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  settlementPartnerAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  settlementDescription?: string;

  @IsOptional()
  @IsIn(TXN_ACTIONS)
  settlementAction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  feePartnerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  feePartnerAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  feeDescription?: string;

  @IsOptional()
  @IsIn(TXN_ACTIONS)
  feeAction?: string;
}

export class CrossAccountDto {
  @IsString()
  @MaxLength(20)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCrossAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class SearchCustomersDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
