import { Body, Controller, Get, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReceiptSettingsService } from './receipt-settings.service';
import { UpdateReceiptSettingsDto } from './dto/update-receipt-settings.dto';

@Controller('api/receipt-settings')
export class ReceiptSettingsController {
  constructor(private readonly service: ReceiptSettingsService) {}

  // Anyone authenticated can read settings (mobile + web admin both need it)
  @Get()
  get() {
    return this.service.getSettings();
  }

  @Put()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  update(@Body() dto: UpdateReceiptSettingsDto) {
    return this.service.updateSettings(dto);
  }
}
