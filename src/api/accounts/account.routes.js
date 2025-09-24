const express = require('express');
const { authenticate } = require('../../middleware/auth.middleware');
const validateRequest = require('../../middleware/validate.request');
const {
  createAccountSchema,
  updateAccountSchema,
  listAccountsSchema,
  getByIdSchema,
  getBalanceSchema,
} = require('./account.validation');
const {
  createAccountHandler,
  listAccountsHandler,
  getAccountByIdHandler,
  updateAccountHandler,
  deleteAccountHandler,
  getAccountBalanceHandler,
  getUserBalancesHandler,
} = require('./account.controller');

const router = express.Router();

router.use(authenticate);

router
  .route('/')
  .post(validateRequest(createAccountSchema), createAccountHandler)
  .get(validateRequest(listAccountsSchema), listAccountsHandler);

router.get('/balances', getUserBalancesHandler);

router
  .route('/:id')
  .get(validateRequest(getByIdSchema), getAccountByIdHandler)
  .patch(validateRequest(updateAccountSchema), updateAccountHandler)
  .delete(validateRequest(getByIdSchema), deleteAccountHandler);

router.get('/:id/balance', validateRequest(getBalanceSchema), getAccountBalanceHandler);

module.exports = router;
