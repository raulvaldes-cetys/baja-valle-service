import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const POSITIVE_INTEGER = /^[1-9]\d*$/;
const PG_INT_MAX = 2_147_483_647n;
const PG_BIGINT_MAX = 9_223_372_036_854_775_807n;

function parsePositiveId(value: string, max: bigint): bigint {
  if (!POSITIVE_INTEGER.test(value) || BigInt(value) > max) {
    throw new BadRequestException('El id debe ser un entero positivo válido');
  }
  return BigInt(value);
}

@Injectable()
export class ParseIntIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    return Number(parsePositiveId(value, PG_INT_MAX));
  }
}

@Injectable()
export class ParseBigIntIdPipe implements PipeTransform<string, bigint> {
  transform(value: string): bigint {
    return parsePositiveId(value, PG_BIGINT_MAX);
  }
}
