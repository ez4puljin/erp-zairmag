import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // --- Expenses ---

  @Get('expenses/summary')
  @Roles(Role.ADMIN)
  getSummary(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.expensesService.getSummary(dateFrom, dateTo);
  }

  @Get('expenses')
  @Roles(Role.ADMIN)
  findAll(
    @Query() pagination: PaginationDto,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.expensesService.findAll(pagination, dateFrom, dateTo, categoryId);
  }

  @Get('expenses/:id')
  @Roles(Role.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findOne(id);
  }

  @Post('expenses')
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreateExpenseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.expensesService.create(dto, userId);
  }

  @Patch('expenses/:id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateExpenseDto>,
  ) {
    return this.expensesService.update(id, dto);
  }

  @Delete('expenses/:id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.remove(id);
  }

  // --- Expense Categories ---

  @Get('expense-categories')
  @Roles(Role.ADMIN)
  getCategories() {
    return this.expensesService.getCategories();
  }

  @Post('expense-categories')
  @Roles(Role.ADMIN)
  createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.expensesService.createCategory(dto);
  }

  @Patch('expense-categories/:id')
  @Roles(Role.ADMIN)
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateExpenseCategoryDto>,
  ) {
    return this.expensesService.updateCategory(id, dto);
  }

  @Delete('expense-categories/:id')
  @Roles(Role.ADMIN)
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.deleteCategory(id);
  }
}
