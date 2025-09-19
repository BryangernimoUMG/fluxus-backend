const express = require('express');
const { authenticate } = require('../../middleware/auth.middleware');
const validateRequest = require('../../middleware/validate.request');
const { createCategorySchema, updateCategorySchema } = require('./category.validation');
const {
  createCategoryHandler,
  getCategoriesHandler,
  getCategoryByIdHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} = require('./category.controller');

const router = express.Router();

router.use(authenticate);

router
  .route('/')
  .post(validateRequest(createCategorySchema), createCategoryHandler)
  .get(getCategoriesHandler);

router
  .route('/:id')
  .get(getCategoryByIdHandler)
  .patch(validateRequest(updateCategorySchema), updateCategoryHandler)
  .delete(deleteCategoryHandler);

module.exports = router;
