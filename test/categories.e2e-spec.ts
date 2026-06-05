import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  mockCategory,
  mockCategoryList,
  mockCreateCategoryDto,
  mockUpdateCategoryDto,
} from '../src/category/__mocks__/category.mock';
import { CategoryController } from '../src/category/category.controller';
import { CategoryService } from '../src/category/category.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrismaService = {
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CategoryController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /categories', () => {
    it('200 – returns category list', async () => {
      mockPrismaService.category.findMany.mockResolvedValue(mockCategoryList);

      const res = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({ name: 'Vinos' });
    });
  });

  describe('GET /categories/:id', () => {
    it('200 – returns category by id', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      const res = await request(app.getHttpServer())
        .get('/categories/1')
        .expect(200);

      expect(res.body).toMatchObject({ name: mockCategory.name });
    });

    it('404 – category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/categories/99').expect(404);
    });
  });

  describe('POST /categories', () => {
    it('201 – creates and returns the category', async () => {
      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      const res = await request(app.getHttpServer())
        .post('/categories')
        .send(mockCreateCategoryDto)
        .expect(201);

      expect(res.body).toMatchObject({ name: mockCategory.name });
    });

    it('400 – missing required name field', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .send({ color: '#FF0000' })
        .expect(400);
    });

    it('400 – extra fields not allowed', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .send({ ...mockCreateCategoryDto, campoExtra: 'no' })
        .expect(400);
    });
  });

  describe('PUT /categories/:id', () => {
    it('200 – updates and returns the category', async () => {
      const updated = { ...mockCategory, ...mockUpdateCategoryDto };
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.update.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .put('/categories/1')
        .send(mockUpdateCategoryDto)
        .expect(200);

      expect(res.body).toMatchObject({ name: mockUpdateCategoryDto.name });
    });

    it('404 – category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/categories/99')
        .send(mockUpdateCategoryDto)
        .expect(404);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('200 – deletes and returns the category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.delete.mockResolvedValue(mockCategory);

      const res = await request(app.getHttpServer())
        .delete('/categories/1')
        .expect(200);

      expect(res.body).toMatchObject({ name: mockCategory.name });
    });

    it('404 – category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer()).delete('/categories/99').expect(404);
    });
  });
});
