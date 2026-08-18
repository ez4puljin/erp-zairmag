import { IsDateString, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

/** Данс хооронд мөнгө шилжүүлэх. */
export class CreateBankTransferDto {
  @IsUUID()
  @IsNotEmpty()
  fromAccountId: string;

  @IsUUID()
  @IsNotEmpty()
  toAccountId: string;

  @Type(() => Number)
  @IsPositive({ message: 'Дүн 0-ээс их байх ёстой.' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  /** Шилжүүлгийн огноо. Заагаагүй бол өнөөдөр. */
  @IsOptional()
  @IsDateString()
  date?: string;
}
