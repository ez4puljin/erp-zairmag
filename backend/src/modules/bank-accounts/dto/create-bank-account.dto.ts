import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateBankAccountDto {
  @IsString() @Length(1, 100) bankName!: string;
  @IsString() @Length(1, 50) accountNumber!: string;
  @IsString() @Length(1, 100) holderName!: string;
  @IsOptional() @IsString() @Length(1, 10) currency?: string;
  @IsOptional() @IsNumber() @Min(0) openingBalance?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  /**
   * ПОС-оос энэ данс руу автоматаар бүртгэгдэх төлбөрийн хэлбэрүүд.
   * Нэг хэлбэрийг зөвхөн нэг данс авч болно.
   */
  @IsOptional()
  @IsArray()
  @IsIn(['CASH', 'BANK_TRANSFER', 'CARD'], { each: true })
  posMethods?: string[];
}
