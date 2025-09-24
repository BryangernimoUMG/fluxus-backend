const catchAsync = require('../../utils/catchAsync');
const service = require('./transaction.service');

// Transactions CRUD
exports.createTransactionHandler = catchAsync(async (req, res) => {
  const tx = await service.createTransaction(req.user, req.body);
  res.status(201).json(tx);
});

exports.listTransactionsHandler = catchAsync(async (req, res) => {
  const data = await service.getTransactionsByUserId(req.user.id, req.query);
  res.json(data);
});

exports.getTransactionByIdHandler = catchAsync(async (req, res) => {
  const tx = await service.getTransactionById(req.user.id, req.params.id);
  res.json(tx);
});

exports.updateTransactionHandler = catchAsync(async (req, res) => {
  const tx = await service.updateTransaction(req.user, req.params.id, req.body);
  res.json(tx);
});

exports.deleteTransactionHandler = catchAsync(async (req, res) => {
  await service.deleteTransaction(req.user.id, req.params.id);
  res.status(204).send();
});

exports.createTransferHandler = catchAsync(async (req, res) => {
  const body = { ...req.body, tipo: 'transferencia' };
  const tx = await service.createTransaction(req.user, body);
  res.status(201).json(tx);
});

// Reports
exports.summaryHandler = catchAsync(async (req, res) => {
  const data = await service.summary(req.user.id, req.query);
  res.json(data);
});

exports.byCategoryHandler = catchAsync(async (req, res) => {
  const data = await service.byCategory(req.user.id, req.query);
  res.json(data);
});

exports.byAccountHandler = catchAsync(async (req, res) => {
  const data = await service.byAccount(req.user.id, req.query);
  res.json(data);
});

exports.cashflowHandler = catchAsync(async (req, res) => {
  const data = await service.cashflow(req.user.id, req.query);
  res.json(data);
});

exports.listTransfersHandler = catchAsync(async (req, res) => {
  const data = await service.listTransfers(req.user.id, req.query);
  res.json(data);
});

// Recurring
exports.createRecurringHandler = catchAsync(async (req, res) => {
  const rec = await service.createRecurring(req.user.id, req.body);
  res.status(201).json(rec);
});

exports.listRecurringHandler = catchAsync(async (req, res) => {
  const data = await service.listRecurring(req.user.id, req.query || {});
  res.json(data);
});

exports.getRecurringByIdHandler = catchAsync(async (req, res) => {
  const rec = await service.getRecurringById(req.user.id, req.params.id);
  res.json(rec);
});

exports.updateRecurringHandler = catchAsync(async (req, res) => {
  const rec = await service.updateRecurring(req.user.id, req.params.id, req.body);
  res.json(rec);
});

exports.deleteRecurringHandler = catchAsync(async (req, res) => {
  await service.deleteRecurring(req.user.id, req.params.id);
  res.status(204).send();
});

exports.runRecurringHandler = catchAsync(async (req, res) => {
  const result = await service.runRecurring(req.user, req.params.id);
  res.json(result);
});

exports.toggleRecurringHandler = catchAsync(async (req, res) => {
  const result = await service.toggleRecurring(req.user.id, req.params.id);
  res.json(result);
});
