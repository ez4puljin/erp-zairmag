"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierPayablesModule = void 0;
const common_1 = require("@nestjs/common");
const supplier_payables_controller_1 = require("./supplier-payables.controller");
const supplier_payables_service_1 = require("./supplier-payables.service");
let SupplierPayablesModule = class SupplierPayablesModule {
};
exports.SupplierPayablesModule = SupplierPayablesModule;
exports.SupplierPayablesModule = SupplierPayablesModule = __decorate([
    (0, common_1.Module)({
        controllers: [supplier_payables_controller_1.SupplierPayablesController],
        providers: [supplier_payables_service_1.SupplierPayablesService],
    })
], SupplierPayablesModule);
//# sourceMappingURL=supplier-payables.module.js.map