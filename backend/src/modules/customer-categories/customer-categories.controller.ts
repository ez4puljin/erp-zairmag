import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CustomerCategoriesService } from './customer-categories.service';
import { CreateCustomerCategoryDto } from './dto/create-customer-category.dto';
import { UpdateCustomerCategoryDto } from './dto/update-customer-category.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/customer-categories')
export class CustomerCategoriesController {
  constructor(private readonly customerCategoriesService: CustomerCategoriesService) {}

  @Get()
  findAll() {
    return this.customerCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerCategoriesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCustomerCategoryDto) {
    return this.customerCategoriesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerCategoryDto,
  ) {
    return this.customerCategoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerCategoriesService.remove(id);
  }
}
