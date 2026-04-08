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
exports.CashClosingsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const cash_closings_service_1 = require("./cash-closings.service");
const create_cash_closing_dto_1 = require("./dto/create-cash-closing.dto");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let CashClosingsController = class CashClosingsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async create(dto, user) {
        return this.service.create(dto, user.id);
    }
    async findAll(dateFrom, dateTo) {
        return this.service.findAll(dateFrom, dateTo);
    }
    async getDailySummary(date) {
        return this.service.getDailySummary(date || new Date().toISOString().split('T')[0]);
    }
    async getLatest() {
        return this.service.getLatest();
    }
};
exports.CashClosingsController = CashClosingsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cash_closing_dto_1.CreateCashClosingDto, Object]),
    __metadata("design:returntype", Promise)
], CashClosingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Query)('dateFrom')),
    __param(1, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CashClosingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('daily-summary'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CashClosingsController.prototype, "getDailySummary", null);
__decorate([
    (0, common_1.Get)('latest'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CashClosingsController.prototype, "getLatest", null);
exports.CashClosingsController = CashClosingsController = __decorate([
    (0, common_1.Controller)('api/cash-closings'),
    __metadata("design:paramtypes", [cash_closings_service_1.CashClosingsService])
], CashClosingsController);
//# sourceMappingURL=cash-closings.controller.js.map