const test = require('node:test');
const assert = require('node:assert/strict');

// Mock PrismaClient to prevent actual database connections during tests
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (path) {
  if (path === '@prisma/client') {
    return { PrismaClient: class {} };
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

test('getAllCustomers rejects non-positive page', async () => {
  const req = { query: { page: '0', limit: '10' }, user: { id: 'u1' } };
  const res = mockRes();
  await CustomerController.getAllCustomers(req, res);
  assert.equal(res.statusCode, 400);
});

test('getAllCustomers rejects non-positive limit', async () => {
  const req = { query: { page: '1', limit: '0' }, user: { id: 'u1' } };
  const res = mockRes();
  await CustomerController.getAllCustomers(req, res);
  assert.equal(res.statusCode, 400);
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
