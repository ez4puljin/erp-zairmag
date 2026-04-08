import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class UpdateSmsSettingsDto {
  @IsString()
  @IsNotEmpty()
  apiUrl: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
