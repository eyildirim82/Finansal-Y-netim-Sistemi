const PRISMA_CUID_PATTERN = /^c[a-z0-9]{24}$/;

export const isPrismaCuid = (value: unknown): boolean => {
  return typeof value === 'string' && PRISMA_CUID_PATTERN.test(value);
};
