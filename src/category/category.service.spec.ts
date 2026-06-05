import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import {
  mockCategory,
  mockCategoryList,
  mockCreateCategoryDto,
  mockUpdateCategoryDto,
} from './__mocks__/category.mock';
import { CategoryService } from './category.service';

const mockPrismaService = {
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all categories including their products', async () => {
      mockPrismaService.category.findMany.mockResolvedValue(mockCategoryList);

      const result = await service.findAll();

      expect(result).toEqual(mockCategoryList);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        include: { products: true },
      });
    });

    it('should return an empty array when there are no categories', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a category by id including its products', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne(1);

      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { products: true },
      });
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new category', async () => {
      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      const result = await service.create(mockCreateCategoryDto);

      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: {
          name: mockCreateCategoryDto.name,
          color: mockCreateCategoryDto.color,
        },
      });
    });
  });

  describe('update', () => {
    it('should update and return the modified category', async () => {
      const updatedCategory = { ...mockCategory, ...mockUpdateCategoryDto };
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.update.mockResolvedValue(updatedCategory);

      const result = await service.update(1, mockUpdateCategoryDto);

      expect(result).toEqual(updatedCategory);
      expect(mockPrismaService.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: mockUpdateCategoryDto,
      });
    });

    it('should throw NotFoundException when updating a non-existent category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.update(99, mockUpdateCategoryDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.category.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete and return the removed category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.delete.mockResolvedValue(mockCategory);

      const result = await service.remove(1);

      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when deleting a non-existent category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.category.delete).not.toHaveBeenCalled();
    });
  });
});

