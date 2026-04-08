import {
  Controller,
  Get,
  Put,
  Post,
  Body,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { SmsService } from './sms.service';
import { UpdateSmsSettingsDto } from './dto/update-sms-settings.dto';
import { SendBulkSmsDto } from './dto/send-bulk-sms.dto';
import { TestSmsDto } from './dto/test-sms.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Get('settings')
  @Roles(Role.ADMIN)
  getSettings() {
    return this.smsService.getSettings();
  }

  @Put('settings')
  @Roles(Role.ADMIN)
  updateSettings(@Body() dto: UpdateSmsSettingsDto) {
    return this.smsService.updateSettings(dto);
  }

  @Post('send-bulk')
  @Roles(Role.ADMIN)
  sendBulk(@Body() dto: SendBulkSmsDto) {
    return this.smsService.sendBulkSms(dto.customerIds, dto.messageTemplate);
  }

  @Post('test')
  @Roles(Role.ADMIN)
  testSms(@Body() dto: TestSmsDto) {
    return this.smsService.sendSms(dto.phone, dto.message);
  }
}
