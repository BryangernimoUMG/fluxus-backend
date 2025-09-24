const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const accountService = require('./account.service');

const createAccountHandler = catchAsync(async (req, res) => {
  const account = await accountService.createAccount(req.user.id, req.body);
  res.status(201).json({ status: 'success', data: { account } });
});

const listAccountsHandler = catchAsync(async (req, res) => {
  const result = await accountService.listAccounts(req.user.id, req.query);
  res.status(200).json({ status: 'success', ...result });
});

const getAccountByIdHandler = catchAsync(async (req, res) => {
  const account = await accountService.getAccountById(req.user.id, req.params.id);
  res.status(200).json({ status: 'success', data: { account } });
});

const updateAccountHandler = catchAsync(async (req, res) => {
  const account = await accountService.updateAccount(req.user.id, req.params.id, req.body);
  res.status(200).json({ status: 'success', data: { account } });
});

const deleteAccountHandler = catchAsync(async (req, res) => {
  await accountService.deleteAccount(req.user.id, req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

const getAccountBalanceHandler = catchAsync(async (req, res) => {
  const balance = await accountService.getAccountBalance(req.user.id, req.params.id, req.query);
  res.status(200).json({ status: 'success', data: { balance } });
});

const getUserBalancesHandler = catchAsync(async (req, res) => {
  const balances = await accountService.getUserBalances(req.user.id);
  res.status(200).json({ status: 'success', data: balances });
});

module.exports = {
  createAccountHandler,
  listAccountsHandler,
  getAccountByIdHandler,
  updateAccountHandler,
  deleteAccountHandler,
  getAccountBalanceHandler,
  getUserBalancesHandler,
};
