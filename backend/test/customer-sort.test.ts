import assert from 'assert';
import Module from 'module';

// Prisma'yı mock'layarak gerçek veritabanı bağlantısını engelle
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === '@prisma/client') {
    return {
      PrismaClient: class {
        customer = { count: async () => 0, findMany: async () => [] };
      }
    };
  }
  return originalRequire.apply(this, arguments as any);
};

// Controller'ı mock'tan sonra import etmeliyiz
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CustomerController } = require('../src/modules/customers/controller');

// Basit bir mock Response sınıfı
class MockResponse {
  statusCode: number = 200;
  body: any;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(payload: any) {
    this.body = payload;
    return this;
  }
}

async function runInvalidSortByTest() {
  const req: any = {
    query: { sortBy: 'invalid', page: '1', limit: '10' },
    user: { id: 1 }
  };
  const res = new MockResponse();

  await CustomerController.getAllCustomers(req, res as any);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  console.log('invalid sortBy test passed');
}

runInvalidSortByTest().catch((err) => {
  console.error(err);
  process.exit(1);
});

