import { Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put, } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateProductDto } from 'src/products/dto/update-product.dto';
import { CategoryService } from './category.service';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoryController {

  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.categoryService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Put()
  update(@Param('id') id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.categoryService.remove(id); //revisar tipo de dato para id
  }

}