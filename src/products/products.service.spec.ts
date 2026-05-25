import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import {
  mockCreateProductDto,
  mockProduct,
  mockProductList,
  mockUpdateProductDto,
} from './__mocks__/products.mock';
import { ProductsService } from './products.service';

const mockPrismaService = {
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all products with their categories', async () => {
      mockPrismaService.product.findMany.mockResolvedValue(mockProductList);

      const result = await service.findAll();

      expect(result).toEqual(mockProductList);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        include: { category: true },
      });
    });

    it('should return an empty array when there are no products', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne(BigInt(1));

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        include: { category: true },
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne(BigInt(99))).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new product', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(mockCreateProductDto);

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: {
          name: mockCreateProductDto.name,
          description: mockCreateProductDto.description,
          features: mockCreateProductDto.features,
          specifications: mockCreateProductDto.specifications,
          price: mockCreateProductDto.price,
          categoryId: mockCreateProductDto.categoryId,
        },
        include: { category: true },
      });
    });
  });

  describe('update', () => {
    it('should update and return the modified product', async () => {
      const updatedProduct = { ...mockProduct, ...mockUpdateProductDto };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.update(BigInt(1), mockUpdateProductDto);

      expect(result).toEqual(updatedProduct);
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: mockUpdateProductDto,
        include: { category: true },
      });
    });

    it('should throw NotFoundException when updating a non-existent product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update(BigInt(99), mockUpdateProductDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete and return the removed product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.delete.mockResolvedValue(mockProduct);

      const result = await service.remove(BigInt(1));

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });

    it('should throw NotFoundException when deleting a non-existent product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove(BigInt(99))).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.product.delete).not.toHaveBeenCalled();
    });
  });
});
