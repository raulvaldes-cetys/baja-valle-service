import { mockCategory, mockCategoryList } from './category.mock';

export const CategoryService = jest.fn().mockImplementation(() => ({
  findAll: jest.fn().mockResolvedValue(mockCategoryList),
  findOne: jest.fn().mockResolvedValue(mockCategory),
  create: jest.fn().mockResolvedValue(mockCategory),
  update: jest.fn().mockResolvedValue(mockCategory),
  remove: jest.fn().mockResolvedValue(mockCategory),
}));
