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
exports.ReceiptSettingsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const receipt_settings_service_1 = require("./receipt-settings.service");
const update_receipt_settings_dto_1 = require("./dto/update-receipt-settings.dto");
let ReceiptSettingsController = class ReceiptSettingsController {
    service;
    constructor(service) {
        this.service = service;
    }
    get() {
        return this.service.getSettings();
    }
    update(dto) {
        return this.service.updateSettings(dto);
    }
};
exports.ReceiptSettingsController = ReceiptSettingsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReceiptSettingsController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_receipt_settings_dto_1.UpdateReceiptSettingsDto]),
    __metadata("design:returntype", void 0)
], ReceiptSettingsController.prototype, "update", null);
exports.ReceiptSettingsController = ReceiptSettingsController = __decorate([
    (0, common_1.Controller)('api/receipt-settings'),
    __metadata("design:paramtypes", [receipt_settings_service_1.ReceiptSettingsService])
], ReceiptSettingsController);
//# sourceMappingURL=receipt-settings.controller.js.map