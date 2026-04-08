"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
let SmsService = class SmsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSettings() {
        const settings = await this.prisma.smsSettings.findFirst();
        if (!settings)
            return null;
        return { ...settings, password: settings.password ? '••••••••' : '' };
    }
    async getSettingsRaw() {
        return this.prisma.smsSettings.findFirst();
    }
    async updateSettings(dto) {
        const existing = await this.prisma.smsSettings.findFirst();
        if (existing) {
            return this.prisma.smsSettings.update({
                where: { id: existing.id },
                data: { apiUrl: dto.apiUrl, username: dto.username, password: dto.password },
            });
        }
        return this.prisma.smsSettings.create({
            data: { apiUrl: dto.apiUrl, username: dto.username, password: dto.password },
        });
    }
    async sendSms(phone, message) {
        const settings = await this.getSettingsRaw();
        if (!settings)
            throw new common_1.BadRequestException('SMS тохиргоо хийгдээгүй байна');
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.length === 8) {
            formattedPhone = '976' + formattedPhone;
        }
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }
        try {
            const auth = Buffer.from(`${settings.username}:${settings.password}`).toString('base64');
            const response = await axios_1.default.post(settings.apiUrl, {
                textMessage: { text: message },
                phoneNumbers: [formattedPhone],
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${auth}`,
                },
                timeout: 10000,
            });
            return { success: true, data: response.data };
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'SMS илгээхэд алдаа гарлаа',
            };
        }
    }
    async sendBulkSms(customerIds, messageTemplate) {
        const settings = await this.getSettingsRaw();
        if (!settings)
            throw new common_1.BadRequestException('SMS тохиргоо хийгдээгүй байна');
        const customers = await this.prisma.customer.findMany({
            where: { id: { in: customerIds }, deletedAt: null },
            select: { id: true, storeName: true, contactName: true, phone: true, outstandingDebt: true },
        });
        const results = [];
        for (const customer of customers) {
            if (!customer.phone) {
                results.push({ customerId: customer.id, storeName: customer.storeName, phone: '', success: false, error: 'Утасны дугаар байхгүй' });
                continue;
            }
            const message = messageTemplate
                .replace(/\{storeName\}/g, customer.storeName || '')
                .replace(/\{contactName\}/g, customer.contactName || '')
                .replace(/\{closingBalance\}/g, Number(customer.outstandingDebt ?? 0).toLocaleString())
                .replace(/\{phone\}/g, customer.phone || '');
            const result = await this.sendSms(customer.phone, message);
            results.push({
                customerId: customer.id,
                storeName: customer.storeName,
                phone: customer.phone,
                success: result.success,
                error: result.success ? undefined : result.error,
            });
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return {
            total: results.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            details: results,
        };
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SmsService);
//# sourceMappingURL=sms.service.js.map