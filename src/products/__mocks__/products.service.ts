import { mockProduct, mockProductSummaryList } from './products.mock';

export const ProductsService = jest.fn().mockImplementation(() => ({
  findAll: jest.fn().mockResolvedValue(mockProductSummaryList),
  findOne: jest.fn().mockResolvedValue(mockProduct),
  create: jest.fn().mockResolvedValue(mockProduct),
  update: jest.fn().mockResolvedValue(mockProduct),
  remove: jest.fn().mockResolvedValue(mockProduct),
}));
