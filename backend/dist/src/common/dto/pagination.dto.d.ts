export declare class PaginationDto {
    page?: number;
    limit?: number;
    search?: string;
    order?: 'asc' | 'desc';
}
export declare class PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}
