import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateCustomerCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(['KHOROO', 'SUM'])
  type: string;

  @IsOptional()
  @IsString()
  description?: string;
}
