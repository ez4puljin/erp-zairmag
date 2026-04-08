import { IsString, IsNotEmpty } from 'class-validator';

export class TestSmsDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
