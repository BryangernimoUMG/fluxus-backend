const express = require('express');
const { authenticate } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate.request');
const ctrl = require('./transaction.controller');
const schemas = require('./transaction.validation');

const router = express.Router();

router.use(authenticate);

// Reports
router.get('/reports/summary', validate(schemas.summarySchema), ctrl.summaryHandler);
router.get('/reports/by-category', validate(schemas.byCategorySchema), ctrl.byCategoryHandler);
router.get('/reports/by-account', validate(schemas.byAccountSchema), ctrl.byAccountHandler);
router.get('/reports/cashflow', validate(schemas.cashflowSchema), ctrl.cashflowHandler);
router.get('/transfers', validate(schemas.transfersListSchema), ctrl.listTransfersHandler);

// Latest transactions
router.get('/latest', validate(schemas.latestTransactionsSchema), ctrl.getLatestTransactionsHandler);

// Recurring
router
  .route('/recurring')
  .post(validate(schemas.createRecurringSchema), ctrl.createRecurringHandler)
  .get(validate(schemas.listRecurringSchema), ctrl.listRecurringHandler);

router
  .route('/recurring/:id')
  .get(validate(schemas.recurringIdSchema), ctrl.getRecurringByIdHandler)
  .patch(validate(schemas.updateRecurringSchema), ctrl.updateRecurringHandler)
  .delete(validate(schemas.recurringIdSchema), ctrl.deleteRecurringHandler);

router.post('/recurring/:id/run', validate(schemas.recurringIdSchema), ctrl.runRecurringHandler);
router.post('/recurring/:id/toggle', validate(schemas.recurringIdSchema), ctrl.toggleRecurringHandler);

// CRUD
router
  .route('/')
  .post(validate(schemas.createTransactionSchema), ctrl.createTransactionHandler)
  .get(validate(schemas.listTransactionsSchema), ctrl.listTransactionsHandler);

// Dedicated transfer creation (optional convenience)
router.post('/transfer', validate(schemas.createTransferSchema), ctrl.createTransferHandler);

router
  .route('/:id')
  .get(validate(schemas.getByIdSchema), ctrl.getTransactionByIdHandler)
  .patch(validate(schemas.updateTransactionSchema), ctrl.updateTransactionHandler)
  .delete(validate(schemas.getByIdSchema), ctrl.deleteTransactionHandler);

module.exports = router;
