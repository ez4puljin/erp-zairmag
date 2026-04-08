import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateReceiptSettingsDto } from './dto/update-receipt-settings.dto';

@Injectable()
export class ReceiptSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.receiptSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.receiptSettings.create({ data: {} });
    }
    return settings;
  }

  async updateSettings(dto: UpdateReceiptSettingsDto) {
    const existing = await this.prisma.receiptSettings.findFirst();
    if (existing) {
      return this.prisma.receiptSettings.update({
        where: { id: existing.id },
        data: dto,
      });
    }
    return this.prisma.receiptSettings.create({ data: dto });
  }
}
