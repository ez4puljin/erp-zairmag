import { IsUUID, IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested, IsInt, Min, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class TruckSaleItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CombinedPaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateTruckSaleDto {
  @IsUUID()
  @IsNotEmpty()
  truckLoadId: string;

  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CombinedPaymentDto)
  combinedPayments?: CombinedPaymentDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Борлуулалт хийгдсэн огноо (нөхөж бүртгэхэд).
   * Заагаагүй бол одоогийн цаг. Зөвхөн ADMIN / WAREHOUSE_MANAGER заана —
   * жолоочийн илгээсэн утгыг сервер үл тоомсорлоно.
   */
  @IsOptional()
  @IsDateString()
  saleDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TruckSaleItemDto)
  items: TruckSaleItemDto[];
}
