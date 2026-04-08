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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const orders_service_1 = require("./orders.service");
const create_order_dto_1 = require("./dto/create-order.dto");
const update_order_status_dto_1 = require("./dto/update-order-status.dto");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let OrdersController = class OrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async adminCreate(dto, user) {
        return this.ordersService.createOrder(dto, user.id, dto.customerId);
    }
    async create(dto, user) {
        if (!user.customerId) {
            throw new common_1.BadRequestException('User does not have an associated customer account.');
        }
        return this.ordersService.createOrder(dto, user.id, user.customerId);
    }
    async findAll(page, limit, status, statuses, customerId, dateFrom, dateTo, receiptPrinted, user) {
        const effectiveCustomerId = user?.role === client_1.Role.CUSTOMER ? user.customerId : customerId;
        const pagination = { page: page ? Number(page) : 1, limit: limit ? Math.min(Number(limit), 100) : 20 };
        return this.ordersService.findAll(pagination, {
            status,
            statuses,
            customerId: effectiveCustomerId,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            receiptPrinted,
        });
    }
    getStockWarnings(id) {
        return this.ordersService.getStockWarnings(id);
    }
    async findOne(id, user) {
        const order = await this.ordersService.findOne(id);
        if (user.role === client_1.Role.CUSTOMER &&
            order.customerId !== user.customerId) {
            throw new common_1.ForbiddenException('You can only view your own orders.');
        }
        return order;
    }
    async updateStatus(id, dto, user) {
        const ALLOWED_TRANSITIONS = {
            PENDING: ['APPROVED', 'CANCELLED'],
            APPROVED: ['SHIPPING', 'CANCELLED'],
            SHIPPING: ['DELIVERED', 'CANCELLED'],
            DELIVERED: [],
            CANCELLED: [],
            CANCELLATION_REQUESTED: ['CANCELLED', 'APPROVED', 'SHIPPING'],
        };
        const order = await this.ordersService.findOne(id);
        const allowed = ALLOWED_TRANSITIONS[order.status] || [];
        if (!allowed.includes(dto.status)) {
            throw new common_1.BadRequestException(`"${order.status}" төлөвөөс "${dto.status}" руу шилжих боломжгүй.`);
        }
        switch (dto.status) {
            case 'APPROVED':
                if (user.role === client_1.Role.DRIVER) {
                    throw new common_1.ForbiddenException('Drivers cannot approve orders.');
                }
                return this.ordersService.approveOrder(id, user.id);
            case 'SHIPPING':
                if (user.role === client_1.Role.DRIVER) {
                    throw new common_1.ForbiddenException('Drivers cannot set orders to shipping.');
                }
                if (!dto.driverId) {
                    throw new common_1.BadRequestException('driverId is required when setting status to SHIPPING.');
                }
                return this.ordersService.updateToShipping(id, dto.driverId, dto.deliveryNotes);
            case 'DELIVERED':
                if (user.role === client_1.Role.DRIVER) {
                    await this.ordersService.verifyDriverAssignment(id, user.id);
                }
                return this.ordersService.deliverOrder(id, user.id, dto.paymentMethod);
            default:
                throw new common_1.BadRequestException(`Invalid target status: ${dto.status}. Allowed: APPROVED, SHIPPING, DELIVERED`);
        }
    }
    markReceiptPrinted(id) {
        return this.ordersService.markReceiptPrinted(id);
    }
    async requestCancel(id, dto, user) {
        const order = await this.ordersService.findOne(id);
        if (order.customerId !== user.customerId) {
            throw new common_1.ForbiddenException('Та зөвхөн өөрийн захиалгыг цуцлах хүсэлт илгээх боломжтой.');
        }
        if (order.status === client_1.OrderStatus.DELIVERED ||
            order.status === client_1.OrderStatus.CANCELLED ||
            order.status === client_1.OrderStatus.CANCELLATION_REQUESTED) {
            throw new common_1.BadRequestException(`Энэ статустай захиалга цуцлах боломжгүй: ${order.status}`);
        }
        return this.ordersService.requestCancellation(id, user.id, dto.cancellationNote);
    }
    async approveCancel(id, dto, user) {
        return this.ordersService.approveCancellation(id, user.id, dto.cancellationNote);
    }
    async rejectCancel(id, dto, user) {
        return this.ordersService.rejectCancellation(id, user.id, dto.cancellationNote);
    }
    async cancel(id, dto, user) {
        return this.ordersService.cancelOrder(id, user.id, dto.cancellationNote);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)('admin'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER, client_1.Role.DRIVER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.AdminCreateOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "adminCreate", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.CUSTOMER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('statuses')),
    __param(4, (0, common_1.Query)('customerId')),
    __param(5, (0, common_1.Query)('dateFrom')),
    __param(6, (0, common_1.Query)('dateTo')),
    __param(7, (0, common_1.Query)('receiptPrinted')),
    __param(8, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id/stock-warnings'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "getStockWarnings", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER, client_1.Role.DRIVER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_status_dto_1.UpdateOrderStatusDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/receipt-printed'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER, client_1.Role.DRIVER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "markReceiptPrinted", null);
__decorate([
    (0, common_1.Patch)(':id/request-cancel'),
    (0, roles_decorator_1.Roles)(client_1.Role.CUSTOMER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_status_dto_1.CancelOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "requestCancel", null);
__decorate([
    (0, common_1.Patch)(':id/approve-cancel'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_status_dto_1.CancelOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "approveCancel", null);
__decorate([
    (0, common_1.Patch)(':id/reject-cancel'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.WAREHOUSE_MANAGER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_status_dto_1.CancelOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "rejectCancel", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_status_dto_1.CancelOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "cancel", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('api/orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map