const catchAsync = require('../../utils/catchAsync');
const categoryService = require('./category.service.js');

const createCategoryHandler = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.user.id, req.body);
  res.status(201).json({
    status: 'success',
    data: {
      category,
    },
  });
});

const getCategoriesHandler = catchAsync(async (req, res) => {
  const categories = await categoryService.getCategoriesByUserId(req.user.id);
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories,
    },
  });
});

const getCategoryByIdHandler = catchAsync(async (req, res) => {
  const category = await categoryService.getCategoryById(req.user.id, req.params.id);
  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

const updateCategoryHandler = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategory(req.user.id, req.params.id, req.body);
  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

const deleteCategoryHandler = catchAsync(async (req, res) => {
  await categoryService.deleteCategory(req.user.id, req.params.id);
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

module.exports = {
  createCategoryHandler,
  getCategoriesHandler,
  getCategoryByIdHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
};
