import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateReceiptSettingsDto {
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() footerMessage?: string;
  @IsOptional() @IsInt() @Min(58) @Max(80) paperWidth?: number;
  @IsOptional() @IsInt() @Min(10) @Max(40) fontSize?: number;
  @IsOptional() @IsBoolean() showCustomer?: boolean;
  @IsOptional() @IsBoolean() showPhone?: boolean;
  @IsOptional() @IsBoolean() showSignatures?: boolean;
  @IsOptional() @IsBoolean() showFooter?: boolean;
  @IsOptional() @IsBoolean() showDriver?: boolean;
  @IsOptional() @IsBoolean() showBarcode?: boolean;
  @IsOptional() @IsBoolean() showItemNumber?: boolean;
  @IsOptional() @IsBoolean() showSaleDriver?: boolean;
  @IsOptional() @IsBoolean() showLoadNumber?: boolean;
  @IsOptional() @IsString() feedbackPhone?: string;
  @IsOptional() @IsBoolean() printTwoCopies?: boolean;
  @IsOptional() @IsBoolean() showVat?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(50) vatRate?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) cityTaxRate?: number;

  // --- Байршлын тохиргоо ---
  @IsOptional() @IsInt() @Min(0) @Max(40) marginX?: number;
  @IsOptional() @IsInt() @Min(0) @Max(40) marginY?: number;
  @IsOptional() @IsInt() @Min(0) @Max(20) lineSpacing?: number;
  @IsOptional() @IsInt() @Min(0) @Max(20) sectionSpacing?: number;
  @IsOptional() @IsInt() @Min(0) @Max(40) signatureSpacing?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10) itemFontBoost?: number;
}
