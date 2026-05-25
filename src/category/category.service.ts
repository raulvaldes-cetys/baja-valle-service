import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoryService {

  findAll() {
    return 'Todas las categorias'; //return this.prisma.category.findMany();
  }

}