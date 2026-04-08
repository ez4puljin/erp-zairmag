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
exports.TruckSalesController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const truck_sales_service_1 = require("./truck-sales.service");
const create_truck_sale_dto_1 = require("./dto/create-truck-sale.dto");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let TruckSalesController = class TruckSalesController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(dto, req) {
        return this.service.createSale(dto, req.user.id);
    }
    findByTruckLoad(truckLoadId) {
        return this.service.findByTruckLoad(truckLoadId);
    }
    findOne(id) {
        return this.service.findOne(id);
    }
    voidSale(id, req) {
        return this.service.voidSale(id, req.user.id);
    }
};
exports.TruckSalesController = TruckSalesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER, client_1.Role.DRIVER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_truck_sale_dto_1.CreateTruckSaleDto, Object]),
    __metadata("design:returntype", void 0)
], TruckSalesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('truck-load/:truckLoadId'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER, client_1.Role.DRIVER),
    __param(0, (0, common_1.Param)('truckLoadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TruckSalesController.prototype, "findByTruckLoad", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER, client_1.Role.DRIVER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TruckSalesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id/void'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TruckSalesController.prototype, "voidSale", null);
exports.TruckSalesController = TruckSalesController = __decorate([
    (0, common_1.Controller)('api/truck-sales'),
    __metadata("design:paramtypes", [truck_sales_service_1.TruckSalesService])
], TruckSalesController);
//# sourceMappingURL=truck-sales.controller.js.map