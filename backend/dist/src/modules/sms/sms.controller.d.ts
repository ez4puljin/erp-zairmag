import { SmsService } from './sms.service';
import { UpdateSmsSettingsDto } from './dto/update-sms-settings.dto';
import { SendBulkSmsDto } from './dto/send-bulk-sms.dto';
import { TestSmsDto } from './dto/test-sms.dto';
export declare class SmsController {
    private readonly smsService;
    constructor(smsService: SmsService);
    getSettings(): Promise<{
        password: string;
        id: string;
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
    sendBulk(dto: SendBulkSmsDto): Promise<{
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
    testSms(dto: TestSmsDto): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
}
