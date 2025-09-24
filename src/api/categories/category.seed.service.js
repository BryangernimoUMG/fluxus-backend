
const defaultCategories = [
  // Ingresos
  { nombre: 'Salario', tipo: 'ingreso', icono: 'cash' },
  { nombre: 'Negocios', tipo: 'ingreso', icono: 'briefcase' },
  { nombre: 'Inversiones', tipo: 'ingreso', icono: 'trending-up' },
  { nombre: 'Regalos', tipo: 'ingreso', icono: 'gift' },
  { nombre: 'Otros Ingresos', tipo: 'ingreso', icono: 'add' },

  // Egresos
  { nombre: 'Comida', tipo: 'egreso', icono: 'fast-food' },
  { nombre: 'Transporte', tipo: 'egreso', icono: 'bus' },
  { nombre: 'Vivienda', tipo: 'egreso', icono: 'home' },
  { nombre: 'Servicios', tipo: 'egreso', icono: 'water' },
  { nombre: 'Compras', tipo: 'egreso', icono: 'cart' },
  { nombre: 'Entretenimiento', tipo: 'egreso', icono: 'film' },
  { nombre: 'Salud', tipo: 'egreso', icono: 'heart' },
  { nombre: 'Educación', tipo: 'egreso', icono: 'school' },
  { nombre: 'Deudas', tipo: 'egreso', icono: 'card' },
  { nombre: 'Otros Gastos', tipo: 'egreso', icono: 'remove' },
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
