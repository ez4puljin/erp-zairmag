import { IsBoolean, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateBankAccountDto {
  @IsString() @Length(1, 100) bankName!: string;
  @IsString() @Length(1, 50) accountNumber!: string;
  @IsString() @Length(1, 100) holderName!: string;
  @IsOptional() @IsString() @Length(1, 10) currency?: string;
  @IsOptional() @IsNumber() @Min(0) openingBalance?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  /** Орлогын данс эсэх. Зөвхөн нэг данс ийм байж болно. */
  @IsOptional() @IsBoolean() isIncomeDefault?: boolean;
}
