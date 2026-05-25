import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  mockCreateProductDto,
  mockProduct,
  mockProductList,
  mockUpdateProductDto,
} from './__mocks__/products.mock';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

const mockProductsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return the list of products', async () => {
      mockProductsService.findAll.mockResolvedValue(mockProductList);

      const result = await controller.findAll();

      expect(result).toEqual(mockProductList);
      expect(mockProductsService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a product by string id', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockProduct);
      expect(mockProductsService.findOne).toHaveBeenCalledWith(BigInt(1));
    });

    it('should propagate NotFoundException when product is not found', async () => {
      mockProductsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a product and return it', async () => {
      mockProductsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(mockCreateProductDto);

      expect(result).toEqual(mockProduct);
      expect(mockProductsService.create).toHaveBeenCalledWith(mockCreateProductDto);
    });
  });

  describe('update', () => {
    it('should update a product and return the updated record', async () => {
      const updatedProduct = { ...mockProduct, ...mockUpdateProductDto };
      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update('1', mockUpdateProductDto);

      expect(result).toEqual(updatedProduct);
      expect(mockProductsService.update).toHaveBeenCalledWith(
        BigInt(1),
        mockUpdateProductDto,
      );
    });

    it('should propagate NotFoundException when product does not exist', async () => {
      mockProductsService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update('99', mockUpdateProductDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a product and return the deleted record', async () => {
      mockProductsService.remove.mockResolvedValue(mockProduct);

      const result = await controller.remove('1');

      expect(result).toEqual(mockProduct);
      expect(mockProductsService.remove).toHaveBeenCalledWith(BigInt(1));
    });

    it('should propagate NotFoundException when product does not exist', async () => {
      mockProductsService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove('99')).rejects.toThrow(NotFoundException);
    });
  });
});
