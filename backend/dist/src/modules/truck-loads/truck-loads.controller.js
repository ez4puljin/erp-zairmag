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
exports.TruckLoadsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const truck_loads_service_1 = require("./truck-loads.service");
const create_truck_load_dto_1 = require("./dto/create-truck-load.dto");
const update_truck_load_dto_1 = require("./dto/update-truck-load.dto");
const submit_return_dto_1 = require("./dto/submit-return.dto");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let TruckLoadsController = class TruckLoadsController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(dto, req) {
        return this.service.create(dto, req.user.id);
    }
    update(id, dto) {
        return this.service.update(id, dto);
    }
    dispatch(id, req) {
        return this.service.dispatch(id, req.user.id);
    }
    addItems(id, body, req) {
        return this.service.addItems(id, body.items, req.user.id);
    }
    submitReturn(id, dto, req) {
        return this.service.submitReturn(id, dto, req.user.id);
    }
    verifyReturn(id, req) {
        return this.service.verifyReturn(id, req.user.id);
    }
    requestCompletion(id, req) {
        return this.service.requestCompletion(id, req.user.id);
    }
    approveCompletion(id, dto, req) {
        return this.service.approveCompletion(id, dto, req.user.id);
    }
    cancel(id, req) {
        return this.service.cancel(id, req.user.id);
    }
    findAll(status, driverId, dateFrom, dateTo, page, limit) {
        return this.service.findAll({
            status,
            driverId,
            dateFrom,
            dateTo,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
    }
    getDriverActiveLoad(req) {
        const role = req.user.role;
        if (role === 'ADMIN' || role === 'WAREHOUSE_MANAGER') {
            return this.service.getAnyActiveLoad();
        }
        return this.service.getDriverActiveLoad(req.user.id);
    }
    findOne(id) {
        return this.service.findOne(id);
    }
};
exports.TruckLoadsController = TruckLoadsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_truck_load_dto_1.CreateTruckLoadDto, Object]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_truck_load_dto_1.UpdateTruckLoadDto]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/dispatch'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "dispatch", null);
__decorate([
    (0, common_1.Post)(':id/add-items'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "addItems", null);
__decorate([
    (0, common_1.Post)(':id/submit-return'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER, client_1.Role.DRIVER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, submit_return_dto_1.SubmitReturnDto, Object]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "submitReturn", null);
__decorate([
    (0, common_1.Post)(':id/verify-return'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "verifyReturn", null);
__decorate([
    (0, common_1.Post)(':id/request-completion'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER, client_1.Role.DRIVER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "requestCompletion", null);
__decorate([
    (0, common_1.Post)(':id/approve-completion'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, submit_return_dto_1.SubmitReturnDto, Object]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "approveCompletion", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('driverId')),
    __param(2, (0, common_1.Query)('dateFrom')),
    __param(3, (0, common_1.Query)('dateTo')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('driver/active'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER, client_1.Role.DRIVER),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "getDriverActiveLoad", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER, client_1.Role.DRIVER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TruckLoadsController.prototype, "findOne", null);
exports.TruckLoadsController = TruckLoadsController = __decorate([
    (0, common_1.Controller)('api/truck-loads'),
    __metadata("design:paramtypes", [truck_loads_service_1.TruckLoadsService])
], TruckLoadsController);
//# sourceMappingURL=truck-loads.controller.js.map