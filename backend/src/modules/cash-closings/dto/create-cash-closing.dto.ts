import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCashClosingDto {
  @IsString()
  @IsNotEmpty()
  closingDate: string; // YYYY-MM-DD

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingBalance: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalCashIn: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalCashOut: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalBankIn: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  closingBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
