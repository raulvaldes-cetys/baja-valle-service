import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

export const mockCategory = {
  id: 1,
  name: 'Vinos',
  color: '#722F37',
  iconUrl: 'https://example.com/icons/vinos.svg',
  products: [],
};

export const mockCategoryList = [
  mockCategory,
  {
    id: 2,
    name: 'Cervezas',
    color: '#F5A623',
    iconUrl: 'https://example.com/icons/cervezas.svg',
    products: [],
  },
];

export const mockCreateCategoryDto: CreateCategoryDto = {
  name: 'Destilados',
  color: '#8B6914',
};

export const mockUpdateCategoryDto: UpdateCategoryDto = {
  name: 'Destilados Premium',
  color: '#A0522D',
};
