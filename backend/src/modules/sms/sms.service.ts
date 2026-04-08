import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSmsSettingsDto } from './dto/update-sms-settings.dto';
import axios from 'axios';

@Injectable()
export class SmsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.smsSettings.findFirst();
    if (!settings) return null;
    // Don't expose password in full
    return { ...settings, password: settings.password ? '••••••••' : '' };
  }

  async getSettingsRaw() {
    return this.prisma.smsSettings.findFirst();
  }

  async updateSettings(dto: UpdateSmsSettingsDto) {
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

  async sendSms(phone: string, message: string) {
    const settings = await this.getSettingsRaw();
    if (!settings) throw new BadRequestException('SMS тохиргоо хийгдээгүй байна');

    // Format phone number - ensure it starts with country code
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 8) {
      formattedPhone = '976' + formattedPhone;
    }
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    try {
      const auth = Buffer.from(`${settings.username}:${settings.password}`).toString('base64');
      const response = await axios.post(
        settings.apiUrl,
        {
          textMessage: { text: message },
          phoneNumbers: [formattedPhone],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          timeout: 10000,
        },
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'SMS илгээхэд алдаа гарлаа',
      };
    }
  }

  async sendBulkSms(customerIds: string[], messageTemplate: string) {
    const settings = await this.getSettingsRaw();
    if (!settings) throw new BadRequestException('SMS тохиргоо хийгдээгүй байна');

    // Fetch customers with receivables data
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, deletedAt: null },
      select: { id: true, storeName: true, contactName: true, phone: true, outstandingDebt: true },
    });

    const results: Array<{ customerId: string; storeName: string; phone: string; success: boolean; error?: string }> = [];

    for (const customer of customers) {
      if (!customer.phone) {
        results.push({ customerId: customer.id, storeName: customer.storeName, phone: '', success: false, error: 'Утасны дугаар байхгүй' });
        continue;
      }

      // Replace placeholders in template
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

      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results,
    };
  }
}
