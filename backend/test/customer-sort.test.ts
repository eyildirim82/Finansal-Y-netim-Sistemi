import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

let capturedOrderBy: any;

// Prisma'yı mock'layarak gerçek veritabanı bağlantısını engelle.
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === '@prisma/client') {
    return {
      PrismaClient: class {
        customer = {
          count: async () => 0,
          findMany: async (args: any) => {
            capturedOrderBy = args.orderBy;
            return [];
          }
        };
      }
    };
  }
  return originalRequire.apply(this, arguments as any);
};

// Controller mock kurulduktan sonra yüklenmeli.
const { CustomerController } = require('../src/modules/customers/controller');

class MockResponse {
  statusCode = 200;
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

test('customer balance sorting uses nested Prisma orderBy', async () => {
  capturedOrderBy = undefined;
  const controller = new CustomerController();
  const req: any = {
    query: { sortBy: 'balance', sortOrder: 'asc', page: '1', limit: '10' },
    user: { id: 'user-1' }
  };
  const res = new MockResponse();

  await controller.getCustomers(req, res as any);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(capturedOrderBy, {
    balance: {
      netBalance: 'asc'
    }
  });
});

test('customer field sorting uses direct Prisma orderBy', async () => {
  capturedOrderBy = undefined;
  const controller = new CustomerController();
  const req: any = {
    query: { sortBy: 'name', sortOrder: 'desc', page: '1', limit: '10' },
    user: { id: 'user-1' }
  };
  const res = new MockResponse();

  await controller.getCustomers(req, res as any);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(capturedOrderBy, { name: 'desc' });
});
