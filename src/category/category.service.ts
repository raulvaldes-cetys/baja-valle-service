import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      include: { products: true },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!category) {
      throw new NotFoundException(`Categoría con id ${id} no encontrada` );
    }
    return category;
  }

  create(dto: CreateCategoryDto){
    return this.prisma.category.create({
      data: {
        name: dto.name,
        color: dto.color,
      },

    });
  }

  async update(id: number, dto: UpdateCategoryDto){
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number){
    await this.findOne(id);
    return this.prisma.category.delete({ where: { id }});
  }


}