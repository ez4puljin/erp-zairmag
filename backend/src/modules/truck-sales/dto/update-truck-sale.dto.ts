import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID,
  Min, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class UpdateTruckSaleItemDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateTruckSaleCombinedDto {
  @IsString()
  method: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;
}

/**
 * Борлуулалт засах (зөвхөн админ).
 *
 * Хуучин борлуулалтыг бүхэлд нь буцаагаад шинэ мөрүүдээр дахин бүртгэдэг тул
 * `items` нь эцсийн байдлыг илэрхийлнэ — өөрчлөлтийн зөрүү биш.
 */
export class UpdateTruckSaleDto {
  /**
   * Харилцагчийг солих. Жолооч буруу харилцагч сонгосон тохиолдолд
   * борлуулалтын өр, төлбөр бүхэлдээ шинэ харилцагч руу шилжинэ.
   */
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateTruckSaleItemDto)
  items?: UpdateTruckSaleItemDto[];

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTruckSaleCombinedDto)
  combinedPayments?: UpdateTruckSaleCombinedDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Ачилт хаагдсан үед барааг агуулах руу буцаахыг зөвшөөрсөн эсэх.
   * Хэрэглэгчээс "итгэлтэй байна уу?" гэж асуугаад л true болгоно.
   */
  @IsOptional()
  @IsBoolean()
  allowWarehouseReturn?: boolean;
}
