import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  mockCategory,
  mockCategoryList,
  mockCreateCategoryDto,
  mockUpdateCategoryDto,
} from './__mocks__/category.mock';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

const mockCategoryService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CategoryController', () => {
  let controller: CategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: mockCategoryService }],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return the list of categories', async () => {
      mockCategoryService.findAll.mockResolvedValue(mockCategoryList);

      const result = await controller.findAll();

      expect(result).toEqual(mockCategoryList);
      expect(mockCategoryService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a category by string id', async () => {
      mockCategoryService.findOne.mockResolvedValue(mockCategory);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockCategory);
      expect(mockCategoryService.findOne).toHaveBeenCalledWith(1);
    });

    it('should propagate NotFoundException when category is not found', async () => {
      mockCategoryService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a category and return it', async () => {
      mockCategoryService.create.mockResolvedValue(mockCategory);

      const result = await controller.create(mockCreateCategoryDto);

      expect(result).toEqual(mockCategory);
      expect(mockCategoryService.create).toHaveBeenCalledWith(
        mockCreateCategoryDto,
      );
    });
  });

  describe('update', () => {
    it('should update a category and return the updated record', async () => {
      const updatedCategory = { ...mockCategory, ...mockUpdateCategoryDto };
      mockCategoryService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('1', mockUpdateCategoryDto);

      expect(result).toEqual(updatedCategory);
      expect(mockCategoryService.update).toHaveBeenCalledWith(
        1,
        mockUpdateCategoryDto,
      );
    });

    it('should propagate NotFoundException when category does not exist', async () => {
      mockCategoryService.update.mockRejectedValue(new NotFoundException());

      await expect(
        controller.update('99', mockUpdateCategoryDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a category and return the deleted record', async () => {
      mockCategoryService.remove.mockResolvedValue(mockCategory);

      const result = await controller.remove('1');

      expect(result).toEqual(mockCategory);
      expect(mockCategoryService.remove).toHaveBeenCalledWith(1);
    });

    it('should propagate NotFoundException when category does not exist', async () => {
      mockCategoryService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove('99')).rejects.toThrow(NotFoundException);
    });
  });
});
