import { IsArray, IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class SendBulkSmsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  customerIds: string[];

  @IsString()
  @IsNotEmpty()
  messageTemplate: string;
}
