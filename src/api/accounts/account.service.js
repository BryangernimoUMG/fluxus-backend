const prisma = require('../../config/prisma.client');
const { Prisma } = require('@prisma/client');
const AppError = require('../../utils/AppError');

function ensureOwnership(where) {
  return prisma.cuentas.findFirst({ where });
}

async function assertAccountOwned(userId, accountId) {
  const acc = await prisma.cuentas.findFirst({ where: { id: accountId, usuario_id: userId } });
  if (!acc) throw new AppError(404, 'Cuenta no encontrada o no tienes permiso para verla.');
  return acc;
}

async function createAccount(userId, data) {
  // Optional rule: prevent duplicate name per user
  const existing = await prisma.cuentas.findFirst({ where: { usuario_id: userId, nombre: data.nombre } });
  if (existing) throw new AppError(409, 'Ya existe una cuenta con ese nombre.');

  const created = await prisma.cuentas.create({
    data: {
      usuario_id: userId,
      nombre: data.nombre,
      tipo: data.tipo,
      moneda: data.moneda?.toUpperCase?.() || data.moneda,
      saldo_inicial: data.saldo_inicial ? new Prisma.Decimal(data.saldo_inicial) : undefined,
      descripcion: data.descripcion,
    },
  });
  return created;
}

async function listAccounts(userId, params = {}) {
  const { page = 1, pageSize = 20, tipo, moneda, search, sort = 'created_at', order = 'desc' } = params;

  // Coerce and sanitize pagination and ordering
  const pageNum = Number(page);
  const pageSizeNum = Number(pageSize);
  const safePage = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
  const safePageSizeRaw = Number.isFinite(pageSizeNum) && pageSizeNum > 0 ? pageSizeNum : 20;
  const safePageSize = Math.min(safePageSizeRaw, 100);
  const safeSort = sort === 'nombre' ? 'nombre' : 'created_at';
  const safeOrder = order === 'asc' ? 'asc' : 'desc';
  const where = {
    usuario_id: userId,
    ...(tipo ? { tipo } : {}),
    ...(moneda ? { moneda: moneda.toUpperCase() } : {}),
    ...(search ? { nombre: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.cuentas.findMany({
      where,
      orderBy: { [safeSort]: safeOrder },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.cuentas.count({ where }),
  ]);

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages: Math.ceil(total / safePageSize) || 1,
  };
}

async function getAccountById(userId, accountId) {
  return assertAccountOwned(userId, accountId);
}

async function updateAccount(userId, accountId, data) {
  const acc = await assertAccountOwned(userId, accountId);

  // If currency change requested, ensure no transactions exist for this account
  if (data.moneda && data.moneda.toUpperCase() !== acc.moneda) {
    const txCount = await prisma.transacciones.count({
      where: {
        usuario_id: userId,
        OR: [{ cuenta_id: accountId }, { cuenta_destino_id: accountId }],
      },
    });
    if (txCount > 0) throw new AppError(409, 'No se puede cambiar la moneda porque existen transacciones asociadas.');
  }

  // Enforce unique name per user if name changes
  if (data.nombre && data.nombre !== acc.nombre) {
    const dup = await prisma.cuentas.findFirst({ where: { usuario_id: userId, nombre: data.nombre, id: { not: accountId } } });
    if (dup) throw new AppError(409, 'Ya existe una cuenta con ese nombre.');
  }

  const updated = await prisma.cuentas.update({
    where: { id: accountId },
    data: {
      nombre: data.nombre,
      tipo: data.tipo,
      moneda: data.moneda?.toUpperCase?.(),
      saldo_inicial: data.saldo_inicial != null ? new Prisma.Decimal(data.saldo_inicial) : undefined,
      descripcion: data.descripcion,
    },
  });
  return updated;
}

async function deleteAccount(userId, accountId) {
  await assertAccountOwned(userId, accountId);

  const hasRelations = await prisma.transacciones.count({
    where: { usuario_id: userId, OR: [{ cuenta_id: accountId }, { cuenta_destino_id: accountId }] },
  });
  if (hasRelations > 0) throw new AppError(409, 'No se puede eliminar la cuenta con transacciones asociadas.');

  const hasRecurrent = await prisma.transacciones_recurrentes.count({
    where: { usuario_id: userId, cuenta_id: accountId },
  });
  if (hasRecurrent > 0) throw new AppError(409, 'No se puede eliminar la cuenta con transacciones recurrentes asociadas.');

  await prisma.cuentas.delete({ where: { id: accountId } });
}

// Balance helpers
function txAmountForAccount(tx, accountId) {
  if (tx.tipo === 'ingreso' && tx.cuenta_id === accountId) return tx.monto;
  if (tx.tipo === 'egreso' && tx.cuenta_id === accountId) return tx.monto.negated ? tx.monto.negated() : new Prisma.Decimal(tx.monto).mul(-1);
  if (tx.tipo === 'transferencia') {
    if (tx.cuenta_id === accountId) return tx.monto.negated ? tx.monto.negated() : new Prisma.Decimal(tx.monto).mul(-1);
    if (tx.cuenta_destino_id === accountId) return tx.monto;
  }
  return new Prisma.Decimal(0);
}

async function getAccountBalance(userId, accountId, opts = {}) {
  const acc = await assertAccountOwned(userId, accountId);

  const where = {
    usuario_id: userId,
    OR: [{ cuenta_id: accountId }, { cuenta_destino_id: accountId }],
    ...(opts.from ? { fecha: { gte: new Date(opts.from) } } : {}),
    ...(opts.to ? {
      fecha: { ...(opts.from ? { gte: new Date(opts.from) } : {}), lte: new Date(opts.to) },
    } : {}),
  };

  const txs = await prisma.transacciones.findMany({
    where,
    orderBy: { fecha: 'asc' },
    select: { id: true, tipo: true, cuenta_id: true, cuenta_destino_id: true, monto: true, monto_base: true, fecha: true },
  });

  const Decimal = Prisma.Decimal;
  let saldo = new Decimal(acc.saldo_inicial);
  let saldoBase = new Decimal(0);

  for (const tx of txs) {
    const delta = txAmountForAccount(tx, accountId);
    saldo = saldo.add(new Decimal(delta));
    // Base uses monto_base with same sign logic
    let baseDelta = new Decimal(0);
    if (tx.tipo === 'ingreso' && tx.cuenta_id === accountId) baseDelta = new Decimal(tx.monto_base);
    if (tx.tipo === 'egreso' && tx.cuenta_id === accountId) baseDelta = new Decimal(tx.monto_base).mul(-1);
    if (tx.tipo === 'transferencia') {
      if (tx.cuenta_id === accountId) baseDelta = new Decimal(tx.monto_base).mul(-1);
      if (tx.cuenta_destino_id === accountId) baseDelta = new Decimal(tx.monto_base);
    }
    saldoBase = saldoBase.add(baseDelta);
  }

  const result = { cuenta_id: accountId, moneda: acc.moneda, saldo_inicial: acc.saldo_inicial, saldo_actual: saldo, saldo_actual_base: saldoBase };
  if (opts.includeDetalle) result.detalle = txs;
  return result;
}

async function getUserBalances(userId) {
  const accounts = await prisma.cuentas.findMany({ where: { usuario_id: userId } });
  const results = [];
  for (const acc of accounts) {
    const bal = await getAccountBalance(userId, acc.id);
    results.push(bal);
  }
  // Aggregate by currency
  const byMoneda = results.reduce((map, r) => {
    map[r.moneda] = (map[r.moneda] || new Prisma.Decimal(0)).add(r.saldo_actual);
    return map;
  }, {});
  const totales = Object.entries(byMoneda).map(([moneda, total]) => ({ moneda, total }));
  return { cuentas: results, totales };
}

module.exports = {
  createAccount,
  listAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  getAccountBalance,
  getUserBalances,
};
