import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, CustomerPaymentType } from '@prisma/client';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  /**
   * RECEIPT = харилцагчаас мөнгө авсан (өр буурна, данс нэмэгдэнэ).
   * PAYOUT  = харилцагчид мөнгө олгосон (өр нэмэгдэнэ, данс хасагдана).
   * Заагаагүй бол RECEIPT.
   */
  @IsOptional()
  @IsEnum(CustomerPaymentType)
  type?: CustomerPaymentType;

  /** Гүйлгээний огноо. Заагаагүй бол одоо. */
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;
}
