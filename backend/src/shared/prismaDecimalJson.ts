import { Prisma } from '@prisma/client';

type PrismaDecimal = InstanceType<typeof Prisma.Decimal>;
type MoneyNumberInput = PrismaDecimal | number | null | undefined;

/**
 * Convert a Prisma Decimal explicitly when application logic needs a JS number
 * for ratios, charts, comparisons or the existing numeric API contract.
 */
export const moneyToNumber = (value: MoneyNumberInput): number => {
  if (value == null) return 0;
  return typeof value === 'number' ? value : value.toNumber();
};

/**
 * Prisma Decimal values serialize to strings by default. The existing API and
 * frontend treat monetary fields as JSON numbers, so keep that public contract
 * while PostgreSQL stores values exactly as DECIMAL(18,2).
 *
 * Code performing numeric reporting/conversion should call `moneyToNumber`
 * explicitly rather than relying on implicit Decimal coercion.
 */
export const configurePrismaDecimalJson = (): void => {
  Object.defineProperty(Prisma.Decimal.prototype, 'toJSON', {
    configurable: true,
    writable: true,
    value: function toJSON(this: PrismaDecimal): number {
      return this.toNumber();
    }
  });
};
