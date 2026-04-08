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
exports.DriversController = void 0;
const common_1 = require("@nestjs/common");
const drivers_service_1 = require("./drivers.service");
const update_delivery_dto_1 = require("./dto/update-delivery.dto");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
let DriversController = class DriversController {
    driversService;
    constructor(driversService) {
        this.driversService = driversService;
    }
    findAll() {
        return this.driversService.findAll();
    }
    getActiveRoutes() {
        return this.driversService.getActiveRoutes();
    }
    findOne(id) {
        return this.driversService.findOne(id);
    }
    getDeliveries(id, date) {
        return this.driversService.getDriverDeliveries(id, date);
    }
    updateDelivery(driverId, orderId, dto) {
        return this.driversService.updateDelivery(driverId, orderId, dto);
    }
    createDriver(body) {
        return this.driversService.createDriver(body);
    }
    updateDriver(id, body) {
        return this.driversService.updateDriver(id, body);
    }
    toggleDriverActive(id) {
        return this.driversService.toggleDriverActive(id);
    }
    resetPassword(id, body) {
        return this.driversService.resetPassword(id, body.password);
    }
};
exports.DriversController = DriversController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('active-routes'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "getActiveRoutes", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/deliveries'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER, client_1.Role.DRIVER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "getDeliveries", null);
__decorate([
    (0, common_1.Patch)(':id/deliveries/:orderId'),
    (0, roles_decorator_1.Roles)(client_1.Role.DRIVER, client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_delivery_dto_1.UpdateDeliveryDto]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "updateDelivery", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "createDriver", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "updateDriver", null);
__decorate([
    (0, common_1.Post)(':id/toggle-active'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "toggleDriverActive", null);
__decorate([
    (0, common_1.Post)(':id/reset-password'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "resetPassword", null);
exports.DriversController = DriversController = __decorate([
    (0, common_1.Controller)('api/drivers'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [drivers_service_1.DriversService])
], DriversController);
//# sourceMappingURL=drivers.controller.js.map