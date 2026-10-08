import { BadRequestException } from '@nestjs/common';
import { ParseBigIntIdPipe, ParseIntIdPipe } from './parse-id.pipe';

describe('ParseIntIdPipe', () => {
  const pipe = new ParseIntIdPipe();

  it('should parse a positive integer', () => {
    expect(pipe.transform('42')).toBe(42);
  });

  it.each(['abc', '0', '-1', '1.5', '01', '1e3', ' 1', '2147483648', ''])(
    'should reject %p',
    (value) => {
      expect(() => pipe.transform(value)).toThrow(BadRequestException);
    },
  );
});

describe('ParseBigIntIdPipe', () => {
  const pipe = new ParseBigIntIdPipe();

  it('should parse ids beyond the INTEGER range', () => {
    expect(pipe.transform('9223372036854775807')).toBe(9223372036854775807n);
  });

  it.each(['abc', '0', '-1', '1.5', '9223372036854775808'])(
    'should reject %p',
    (value) => {
      expect(() => pipe.transform(value)).toThrow(BadRequestException);
    },
  );
});
