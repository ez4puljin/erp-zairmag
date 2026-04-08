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
exports.ProductLedgerController = void 0;
const common_1 = require("@nestjs/common");
const product_ledger_service_1 = require("./product-ledger.service");
const product_ledger_query_dto_1 = require("./dto/product-ledger-query.dto");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let ProductLedgerController = class ProductLedgerController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getLedger(query) {
        return this.service.getLedger(query);
    }
};
exports.ProductLedgerController = ProductLedgerController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_ledger_query_dto_1.ProductLedgerQueryDto]),
    __metadata("design:returntype", Promise)
], ProductLedgerController.prototype, "getLedger", null);
exports.ProductLedgerController = ProductLedgerController = __decorate([
    (0, common_1.Controller)('api/product-ledger'),
    __metadata("design:paramtypes", [product_ledger_service_1.ProductLedgerService])
], ProductLedgerController);
//# sourceMappingURL=product-ledger.controller.js.map