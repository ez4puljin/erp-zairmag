import { IsString, IsOptional, IsNumber, IsEnum, IsUUID, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, CustomerPaymentType } from '@prisma/client';

/**
 * Төлбөр засах. Харилцагчийг өөрчлөхийг зөвшөөрөхгүй —
 * буруу харилцагч дээр бүртгэсэн бол устгаад дахин бүртгэнэ.
 */
export class UpdatePaymentDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsEnum(CustomerPaymentType)
  type?: CustomerPaymentType;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  note?: string;

  /** null илгээвэл дансны холбоосыг салгана. */
  @IsOptional()
  @IsUUID()
  bankAccountId?: string | null;
}
