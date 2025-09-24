
const defaultAccounts = [
  {
    nombre: 'Efectivo',
    tipo: 'efectivo',
    descripcion: 'Dinero en efectivo disponible.',
  },
  {
    nombre: 'Cuenta Principal',
    tipo: 'banco',
    descripcion: 'Cuenta bancaria principal para ingresos y pagos.',
  },
  {
    nombre: 'Tarjeta de Crédito',
    tipo: 'tarjeta_credito',
    descripcion: 'Compras realizadas con tarjeta de crédito.',
  },
];

/**
 * Crea las cuentas por defecto para un nuevo usuario.
 * @param {object} user - El objeto de usuario completo, que contiene id y moneda_base.
 * @param {import('@prisma/client').PrismaClient} prisma - Instancia del cliente de Prisma.
 */
const createDefaultAccountsForUser = async (user, prisma) => {
  const { id: userId, moneda_base: userCurrency } = user;

  if (!userId || !userCurrency) {
    console.error("Error: Faltan datos del usuario (ID o moneda) para crear cuentas por defecto.");
    return;
  }

  const accountsToCreate = defaultAccounts.map(account => ({
    ...account,
    usuario_id: userId,
    moneda: userCurrency,
    saldo_inicial: 0,
  }));

  await prisma.cuentas.createMany({
    data: accountsToCreate,
    skipDuplicates: true, // Evita errores si las cuentas ya existen por alguna razón
  });
};

export { createDefaultAccountsForUser };
