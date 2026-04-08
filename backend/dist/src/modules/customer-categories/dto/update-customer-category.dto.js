"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCustomerCategoryDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_customer_category_dto_1 = require("./create-customer-category.dto");
class UpdateCustomerCategoryDto extends (0, mapped_types_1.PartialType)(create_customer_category_dto_1.CreateCustomerCategoryDto) {
}
exports.UpdateCustomerCategoryDto = UpdateCustomerCategoryDto;
//# sourceMappingURL=update-customer-category.dto.js.map