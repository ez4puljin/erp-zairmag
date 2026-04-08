"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerCategoriesModule = void 0;
const common_1 = require("@nestjs/common");
const customer_categories_controller_1 = require("./customer-categories.controller");
const customer_categories_service_1 = require("./customer-categories.service");
let CustomerCategoriesModule = class CustomerCategoriesModule {
};
exports.CustomerCategoriesModule = CustomerCategoriesModule;
exports.CustomerCategoriesModule = CustomerCategoriesModule = __decorate([
    (0, common_1.Module)({
        controllers: [customer_categories_controller_1.CustomerCategoriesController],
        providers: [customer_categories_service_1.CustomerCategoriesService],
        exports: [customer_categories_service_1.CustomerCategoriesService],
    })
], CustomerCategoriesModule);
//# sourceMappingURL=customer-categories.module.js.map