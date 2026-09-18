import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** 8/6-ны авлагын эхний үлдэгдлийг засах (зөвхөн админ). */
export class SetOpeningBalanceDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;
}
