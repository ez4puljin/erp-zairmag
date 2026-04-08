import { PaginationDto } from '../../../common/dto/pagination.dto';
export declare class QueryProductDto extends PaginationDto {
    categoryId?: string;
    inStock?: boolean;
    sortBy?: string;
}
