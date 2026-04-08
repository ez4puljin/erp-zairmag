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
exports.ReceivablesController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const receivables_service_1 = require("./receivables.service");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let ReceivablesController = class ReceivablesController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getSummary(dateFrom, dateTo, customerId, categoryId) {
        return this.service.getReceivablesSummary(dateFrom, dateTo, customerId, categoryId);
    }
    getDebtAging() {
        return this.service.getDebtAging();
    }
    async getCustomerLedger(customerId, dateFrom, dateTo) {
        return this.service.getCustomerLedger(customerId, dateFrom, dateTo);
    }
};
exports.ReceivablesController = ReceivablesController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Query)('dateFrom')),
    __param(1, (0, common_1.Query)('dateTo')),
    __param(2, (0, common_1.Query)('customerId')),
    __param(3, (0, common_1.Query)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReceivablesController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('aging'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReceivablesController.prototype, "getDebtAging", null);
__decorate([
    (0, common_1.Get)(':customerId'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('customerId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('dateFrom')),
    __param(2, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReceivablesController.prototype, "getCustomerLedger", null);
exports.ReceivablesController = ReceivablesController = __decorate([
    (0, common_1.Controller)('api/receivables'),
    __metadata("design:paramtypes", [receivables_service_1.ReceivablesService])
], ReceivablesController);
//# sourceMappingURL=receivables.controller.js.map