import { mockProduct, mockProductList } from './products.mock';

export const ProductsService = jest.fn().mockImplementation(() => ({
  findAll: jest.fn().mockResolvedValue(mockProductList),
  findOne: jest.fn().mockResolvedValue(mockProduct),
  create: jest.fn().mockResolvedValue(mockProduct),
  update: jest.fn().mockResolvedValue(mockProduct),
  remove: jest.fn().mockResolvedValue(mockProduct),
}));
