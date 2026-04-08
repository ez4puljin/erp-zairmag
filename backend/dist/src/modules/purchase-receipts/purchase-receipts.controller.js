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
exports.PurchaseReceiptsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const purchase_receipts_service_1 = require("./purchase-receipts.service");
const create_purchase_receipt_dto_1 = require("./dto/create-purchase-receipt.dto");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let PurchaseReceiptsController = class PurchaseReceiptsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async create(dto, user) {
        return this.service.create(dto, user.id);
    }
    async findAll(pagination, supplierId, dateFrom, dateTo) {
        return this.service.findAll(pagination, { supplierId, dateFrom, dateTo });
    }
    async findOne(id) {
        return this.service.findOne(id);
    }
};
exports.PurchaseReceiptsController = PurchaseReceiptsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_purchase_receipt_dto_1.CreatePurchaseReceiptDto, Object]),
    __metadata("design:returntype", Promise)
], PurchaseReceiptsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('supplierId')),
    __param(2, (0, common_1.Query)('dateFrom')),
    __param(3, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.PaginationDto, String, String, String]),
    __metadata("design:returntype", Promise)
], PurchaseReceiptsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PurchaseReceiptsController.prototype, "findOne", null);
exports.PurchaseReceiptsController = PurchaseReceiptsController = __decorate([
    (0, common_1.Controller)('api/purchase-receipts'),
    __metadata("design:paramtypes", [purchase_receipts_service_1.PurchaseReceiptsService])
], PurchaseReceiptsController);
//# sourceMappingURL=purchase-receipts.controller.js.map