const test = require('node:test');
const assert = require('node:assert/strict');

// Mock PrismaClient to prevent actual database connections during tests.
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (path) {
  if (path === '@prisma/client') {
    return {
      PrismaClient: class {
        customer = {
          findMany: async () => [],
          count: async () => 0
        };
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

const { CustomerController } = require('../src/modules/customers/controller');
const { TransactionController } = require('../src/modules/transactions/controller');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('getCustomers normalizes a non-positive page to one', async () => {
  const controller = new CustomerController();
  const req = { query: { page: '-1', limit: '10' }, user: { id: 'u1' } };
  const res = mockRes();

  await controller.getCustomers(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.pagination.page, 1);
  assert.equal(res.body.data.pagination.limit, 10);
});

test('getCustomers normalizes a negative limit to one', async () => {
  const controller = new CustomerController();
  const req = { query: { page: '1', limit: '-1' }, user: { id: 'u1' } };
  const res = mockRes();

  await controller.getCustomers(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.pagination.page, 1);
  assert.equal(res.body.data.pagination.limit, 1);
});

test('getAllTransactions rejects non-positive page', async () => {
  const req = { query: { page: '-1', limit: '10' } };
  const res = mockRes();
  await TransactionController.getAllTransactions(req, res);
  assert.equal(res.statusCode, 400);
});

test('getAllTransactions rejects non-positive limit', async () => {
  const req = { query: { page: '1', limit: 'abc' } };
  const res = mockRes();
  await TransactionController.getAllTransactions(req, res);
  assert.equal(res.statusCode, 400);
});
