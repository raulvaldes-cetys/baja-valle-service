import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Public, Roles } from '../auth/auth.decorators';
import { Role } from '../generated/prisma/enums';
import { ParseIntIdPipe } from '../common/pipes/parse-id.pipe';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Public()
  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntIdPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntIdPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntIdPipe) id: number) {
    return this.categoryService.remove(id);
  }
}
