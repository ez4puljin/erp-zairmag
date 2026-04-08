import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(['APPROVED', 'SHIPPING', 'DELIVERED'])
  status: 'APPROVED' | 'SHIPPING' | 'DELIVERED';

  @ValidateIf((o) => o.status === 'SHIPPING')
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  cancellationNote?: string;
}
