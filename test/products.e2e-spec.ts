import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  mockCreateProductDto,
  mockProduct,
  mockProductSummaryList,
  mockUpdateProductDto,
} from '../src/products/__mocks__/products.mock';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProductsController } from '../src/products/products.controller';
import { ProductsService } from '../src/products/products.service';

(BigInt.prototype as { toJSON?: () => string }).toJSON = function (
  this: bigint,
) {
  return this.toString();
};

const mockPrismaService = {
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ProductsController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
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

  describe('GET /products', () => {
    it('200 – returns product summary list', async () => {
      mockPrismaService.product.findMany.mockResolvedValue(mockProductSummaryList);

      const res = await request(app.getHttpServer()).get('/products').expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        name: 'Vino Tinto Gran Reserva',
        price: 450,
      });
    });
  });

  describe('GET /products/:id', () => {
    it('200 – returns product by id', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const res = await request(app.getHttpServer()).get('/products/1').expect(200);

      expect(res.body).toMatchObject({
        name: mockProduct.name,
        price: mockProduct.price,
      });
    });

    it('404 – product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/products/99').expect(404);
    });
  });

  describe('POST /products', () => {
    it('201 – creates and returns the product', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const res = await request(app.getHttpServer())
        .post('/products')
        .send(mockCreateProductDto)
        .expect(201);

      expect(res.body).toMatchObject({
        name: mockProduct.name,
        price: mockProduct.price,
      });
    });

    it('400 – missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'Solo nombre' })
        .expect(400);
    });

    it('400 – extra fields not allowed', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ ...mockCreateProductDto, campoExtra: 'no permitido' })
        .expect(400);
    });
  });

  describe('PUT /products/:id', () => {
    it('200 – updates and returns the product', async () => {
      const updated = { ...mockProduct, ...mockUpdateProductDto };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .put('/products/1')
        .send(mockUpdateProductDto)
        .expect(200);

      expect(res.body).toMatchObject({ name: mockUpdateProductDto.name });
    });

    it('404 – product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/products/99')
        .send(mockUpdateProductDto)
        .expect(404);
    });
  });

  describe('DELETE /products/:id', () => {
    it('200 – deletes and returns the product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.delete.mockResolvedValue(mockProduct);

      const res = await request(app.getHttpServer())
        .delete('/products/1')
        .expect(200);

      expect(res.body).toMatchObject({ name: mockProduct.name });
    });

    it('404 – product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer()).delete('/products/99').expect(404);
    });
  });
});
