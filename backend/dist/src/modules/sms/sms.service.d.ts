import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSmsSettingsDto } from './dto/update-sms-settings.dto';
export declare class SmsService {
    private prisma;
    constructor(prisma: PrismaService);
    getSettings(): Promise<{
        password: string;
        id: string;
        isActive: boolean;
        updatedAt: Date;
        apiUrl: string;
        username: string;
    } | null>;
    getSettingsRaw(): Promise<{
        id: string;
        password: string;
        isActive: boolean;
        updatedAt: Date;
        apiUrl: string;
        username: string;
    } | null>;
    updateSettings(dto: UpdateSmsSettingsDto): Promise<{
        id: string;
        password: string;
        isActive: boolean;
        updatedAt: Date;
        apiUrl: string;
        username: string;
    }>;
    sendSms(phone: string, message: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    sendBulkSms(customerIds: string[], messageTemplate: string): Promise<{
        total: number;
        success: number;
        failed: number;
        details: {
            customerId: string;
            storeName: string;
            phone: string;
            success: boolean;
            error?: string;
        }[];
    }>;
}
