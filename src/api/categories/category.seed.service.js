
const defaultCategories = [
    // Ingresos
    { nombre: 'Salario', tipo: 'ingreso', icono: 'cash', color: '#4CAF50', importancia: 'esencial' },
    { nombre: 'Negocios', tipo: 'ingreso', icono: 'briefcase', color: '#2196F3', importancia: 'necesario' },
    { nombre: 'Inversiones', tipo: 'ingreso', icono: 'trending-up', color: '#FF9800', importancia: 'necesario' },
    { nombre: 'Regalos', tipo: 'ingreso', icono: 'gift', color: '#9C27B0', importancia: 'prescindible' },
    { nombre: 'Otros Ingresos', tipo: 'ingreso', icono: 'add', color: '#607D8B', importancia: 'prescindible' },

    // Egresos
    { nombre: 'Comida', tipo: 'egreso', icono: 'fast-food', color: '#FFEB3B', importancia: 'esencial' },
    { nombre: 'Transporte', tipo: 'egreso', icono: 'bus', color: '#00BCD4', importancia: 'necesario' },
    { nombre: 'Vivienda', tipo: 'egreso', icono: 'home', color: '#795548', importancia: 'esencial' },
    { nombre: 'Servicios', tipo: 'egreso', icono: 'water', color: '#03A9F4', importancia: 'necesario' },
    { nombre: 'Compras', tipo: 'egreso', icono: 'cart', color: '#8BC34A', importancia: 'prescindible' },
    { nombre: 'Entretenimiento', tipo: 'egreso', icono: 'film', color: '#FFC107', importancia: 'prescindible' },
    { nombre: 'Salud', tipo: 'egreso', icono: 'heart', color: '#E57373', importancia: 'esencial' },
    { nombre: 'Educación', tipo: 'egreso', icono: 'school', color: '#64B5F6', importancia: 'necesario' },
    { nombre: 'Deudas', tipo: 'egreso', icono: 'card', color: '#F44336', importancia: 'esencial' },
    { nombre: 'Otros Gastos', tipo: 'egreso', icono: 'remove', color: '#9E9E9E', importancia: 'prescindible' },
];

/**
 * Crea las categorías por defecto para un nuevo usuario.
 * @param {string} userId - El ID del usuario para el cual se crearán las categorías.
 * @param {import('@prisma/client').PrismaClient} prisma - Instancia del cliente de Prisma.
 */
const createDefaultCategoriesForUser = async (userId, prisma) => {
  const categoriesToCreate = defaultCategories.map(category => ({
    ...category,
    usuario_id: userId,
  }));

  await prisma.categorias.createMany({
    data: categoriesToCreate,
    skipDuplicates: true, // No fallar si una categoría ya existe (aunque no debería pasar en la creación)
  });
};

export { createDefaultCategoriesForUser };
