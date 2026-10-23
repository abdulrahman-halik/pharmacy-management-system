export interface ApiErrorResponse {
    statusCode: number;
    code: string;
    message: string;
    details?: Record<string, any> | Array<any>;
    requestId: string;
    timestamp: string;
    path: string;
}
export type HealthStatus = 'UP' | 'DOWN' | 'READY' | 'DEGRADED';
export interface HealthCheckResponse {
    status: HealthStatus;
    timestamp: string;
    uptimeSeconds?: number;
    services?: {
        mysql?: HealthStatus;
        redis?: HealthStatus;
        minio?: HealthStatus;
        [key: string]: HealthStatus | undefined;
    };
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
//# sourceMappingURL=index.d.ts.map