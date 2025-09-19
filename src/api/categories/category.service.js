const prisma = require('../../config/prisma.client');
const AppError = require('../../utils/AppError');

const createCategory = async (userId, categoryData) => {
  const { nombre, tipo } = categoryData;

  const existingCategory = await prisma.categorias.findFirst({
    where: {
      usuario_id: userId,
      nombre,
      tipo,
    },
  });

  if (existingCategory) {
    throw new AppError(409, 'Ya existe una categoría con el mismo nombre y tipo.');
  }

  return prisma.categorias.create({
    data: {
      ...categoryData,
      usuario_id: userId,
    },
  });
};

const getCategoriesByUserId = async (userId) => {
  return prisma.categorias.findMany({
    where: {
      usuario_id: userId,
    },
  });
};

const getCategoryById = async (userId, categoryId) => {
  const category = await prisma.categorias.findFirst({
    where: {
      id: categoryId,
      usuario_id: userId,
    },
  });

  if (!category) {
    throw new AppError(404, 'Categoría no encontrada o no tienes permiso para verla.');
  }

  return category;
};

const updateCategory = async (userId, categoryId, categoryData) => {
  await getCategoryById(userId, categoryId); // Check ownership and existence

  if (categoryData.nombre || categoryData.tipo) {
    const { nombre, tipo } = categoryData;
    const existingCategory = await prisma.categorias.findFirst({
      where: {
        usuario_id: userId,
        nombre: nombre,
        tipo: tipo,
        id: { not: categoryId },
      },
    });

    if (existingCategory) {
      throw new AppError(409, 'Ya existe una categoría con el mismo nombre y tipo.');
    }
  }

  return prisma.categorias.update({
    where: {
      id: categoryId,
    },
    data: categoryData,
  });
};

const deleteCategory = async (userId, categoryId) => {
  await getCategoryById(userId, categoryId); // Check ownership and existence

  return prisma.categorias.delete({
    where: {
      id: categoryId,
    },
  });
};

module.exports = {
  createCategory,
  getCategoriesByUserId,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
