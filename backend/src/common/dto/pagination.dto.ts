import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Нэг хуудсанд авах мөрийн тоо.
   *
   * Дээд хязгаар 1000 — сонголтын жагсаалт (харилцагч, бараа) дүүргэхийн тулд
   * бүх мөрийг нэг удаа татдаг хуудсууд байдаг. Өмнө нь 100 байсан тул тэдгээр
   * хүсэлт 400 буцаж, жагсаалт чимээгүй хоосон үлддэг байв.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
