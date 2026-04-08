import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { SupplierPaymentType, PaymentMethod } from '@prisma/client';

export class CreateSupplierPaymentDto {
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsEnum(SupplierPaymentType)
  @IsOptional()
  type?: SupplierPaymentType = SupplierPaymentType.PAYMENT;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsDateString()
  date: string;
}
