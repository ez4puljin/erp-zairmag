import { IsOptional, IsString } from 'class-validator';

export class UpdateDeliveryDto {
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @IsOptional()
  @IsString()
  proofOfDelivery?: string; // base64 or URL
}
