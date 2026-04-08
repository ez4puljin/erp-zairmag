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
exports.SupplierPayablesController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const supplier_payables_service_1 = require("./supplier-payables.service");
const create_supplier_payment_dto_1 = require("./dto/create-supplier-payment.dto");
let SupplierPayablesController = class SupplierPayablesController {
    service;
    constructor(service) {
        this.service = service;
    }
    createPayment(dto, req) {
        return this.service.createPayment(dto, req.user.id);
    }
    getPayments(supplierId) {
        return this.service.getPayments(supplierId);
    }
    getSummary(startDate, endDate, supplierId) {
        return this.service.getPayablesSummary(startDate, endDate, supplierId);
    }
    getLedger(supplierId, startDate, endDate) {
        return this.service.getSupplierLedger(supplierId, startDate, endDate);
    }
};
exports.SupplierPayablesController = SupplierPayablesController;
__decorate([
    (0, common_1.Post)('payments'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_supplier_payment_dto_1.CreateSupplierPaymentDto, Object]),
    __metadata("design:returntype", void 0)
], SupplierPayablesController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Get)('payments'),
    __param(0, (0, common_1.Query)('supplierId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SupplierPayablesController.prototype, "getPayments", null);
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Query)('supplierId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SupplierPayablesController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('ledger/:supplierId'),
    __param(0, (0, common_1.Param)('supplierId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SupplierPayablesController.prototype, "getLedger", null);
exports.SupplierPayablesController = SupplierPayablesController = __decorate([
    (0, common_1.Controller)('api/supplier-payables'),
    __metadata("design:paramtypes", [supplier_payables_service_1.SupplierPayablesService])
], SupplierPayablesController);
//# sourceMappingURL=supplier-payables.controller.js.map