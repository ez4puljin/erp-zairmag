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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancelOrderDto = exports.UpdateOrderStatusDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateOrderStatusDto {
    status;
    driverId;
    deliveryNotes;
    paymentMethod;
}
exports.UpdateOrderStatusDto = UpdateOrderStatusDto;
__decorate([
    (0, class_validator_1.IsIn)(['APPROVED', 'SHIPPING', 'DELIVERED']),
    __metadata("design:type", String)
], UpdateOrderStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.status === 'SHIPPING'),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateOrderStatusDto.prototype, "driverId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOrderStatusDto.prototype, "deliveryNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOrderStatusDto.prototype, "paymentMethod", void 0);
class CancelOrderDto {
    cancellationNote;
}
exports.CancelOrderDto = CancelOrderDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CancelOrderDto.prototype, "cancellationNote", void 0);
//# sourceMappingURL=update-order-status.dto.js.map