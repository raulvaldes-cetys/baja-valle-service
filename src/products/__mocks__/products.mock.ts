import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

export const mockCategory = {
  id: 1,
  name: 'Vinos',
  color: '#722F37',
  iconUrl: 'https://example.com/icons/vinos.svg',
};

export const mockProduct = {
  id: BigInt(1),
  name: 'Vino Tinto Gran Reserva',
  description:
    'Vino tinto de alta calidad proveniente del Valle de Guadalupe, con notas a frutos rojos y madera.',
  features: [
    'Taninos suaves',
    'Aroma frutal intenso',
    'Envejecido 18 meses en barrica de roble',
  ],
  specifications:
    'Uva: Cabernet Sauvignon | Añada: 2021 | Alcohol: 14% | Región: Valle de Guadalupe',
  price: 450.0,
  imageUrl: 'https://example.com/images/vino-tinto-gran-reserva.png',
  categoryId: 1,
  category: mockCategory,
};

export const mockProductList = [
  mockProduct,
  {
    id: BigInt(2),
    name: 'Vino Blanco Chardonnay',
    description: 'Chardonnay fresco y elegante con notas cítricas y florales.',
    features: [
      'Acidez balanceada',
      'Notas de manzana verde',
      'Fermentado en acero inoxidable',
    ],
    specifications:
      'Uva: Chardonnay | Añada: 2022 | Alcohol: 12.5% | Región: Valle de Calafia',
    price: 320.0,
    imageUrl: 'https://example.com/images/vino-blanco-chardonnay.png',
    categoryId: 1,
    category: mockCategory,
  },
];

export const mockCreateProductDto: CreateProductDto = {
  name: 'Vino Rosado Garnacha',
  description: 'Rosado vibrante con aromas a fresas frescas y pétalos de rosa.',
  features: [
    'Color rosado brillante',
    'Final refrescante',
    'Ideal para mariscos',
  ],
  specifications:
    'Uva: Garnacha | Añada: 2023 | Alcohol: 13% | Región: Valle de Ojos Negros',
  price: 280.0,
  categoryId: 1,
};

export const mockUpdateProductDto: UpdateProductDto = {
  name: 'Vino Rosado Garnacha Premium',
  price: 310.0,
};
