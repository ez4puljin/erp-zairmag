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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const sms_service_1 = require("./sms.service");
const update_sms_settings_dto_1 = require("./dto/update-sms-settings.dto");
const send_bulk_sms_dto_1 = require("./dto/send-bulk-sms.dto");
const test_sms_dto_1 = require("./dto/test-sms.dto");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let SmsController = class SmsController {
    smsService;
    constructor(smsService) {
        this.smsService = smsService;
    }
    getSettings() {
        return this.smsService.getSettings();
    }
    updateSettings(dto) {
        return this.smsService.updateSettings(dto);
    }
    sendBulk(dto) {
        return this.smsService.sendBulkSms(dto.customerIds, dto.messageTemplate);
    }
    testSms(dto) {
        return this.smsService.sendSms(dto.phone, dto.message);
    }
};
exports.SmsController = SmsController;
__decorate([
    (0, common_1.Get)('settings'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SmsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)('settings'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_sms_settings_dto_1.UpdateSmsSettingsDto]),
    __metadata("design:returntype", void 0)
], SmsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Post)('send-bulk'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_bulk_sms_dto_1.SendBulkSmsDto]),
    __metadata("design:returntype", void 0)
], SmsController.prototype, "sendBulk", null);
__decorate([
    (0, common_1.Post)('test'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [test_sms_dto_1.TestSmsDto]),
    __metadata("design:returntype", void 0)
], SmsController.prototype, "testSms", null);
exports.SmsController = SmsController = __decorate([
    (0, common_1.Controller)('api/sms'),
    __metadata("design:paramtypes", [sms_service_1.SmsService])
], SmsController);
//# sourceMappingURL=sms.controller.js.map