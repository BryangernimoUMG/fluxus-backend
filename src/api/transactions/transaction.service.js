const prisma = require('../../config/prisma.client');
const { Prisma } = require('@prisma/client');
const AppError = require('../../utils/AppError');

// Helpers
async function assertAccount(userId, accountId) {
  const acc = await prisma.cuentas.findFirst({ where: { id: accountId, usuario_id: userId } });
  if (!acc) throw new AppError(403, 'Acceso denegado a la cuenta');
  return acc;
}

async function assertCategory(userId, categoryId) {
  if (!categoryId) return null;
  const cat = await prisma.categorias.findFirst({ where: { id: categoryId, usuario_id: userId } });
  if (!cat) throw new AppError(403, 'Acceso denegado a la categoría');
  return cat;
}

function ensureRateAndBase(user, moneda, monto, tasa_cambio) {
  const Decimal = Prisma.Decimal;
  const isBase = user.moneda_base === moneda;
  if (isBase) {
    return { tasa: new Decimal(1), monto_base: new Decimal(monto) };
  }
  if (!tasa_cambio || Number(tasa_cambio) <= 0) throw new AppError(400, 'tasa_cambio requerida y > 0 para moneda diferente a la base');
  const tasa = new Decimal(tasa_cambio);
  return { tasa, monto_base: new Decimal(monto).mul(tasa) };
}

function validateCategoryMatchesType(cat, tipo) {
  if (!cat) return;
  if (tipo === 'transferencia') throw new AppError(400, 'categoria_id no aplica a transferencias');
  if (cat.tipo !== tipo) throw new AppError(400, `La categoría ${cat.nombre} es de tipo ${cat.tipo} y no coincide con ${tipo}`);
}

async function createTransaction(user, payload) {
  const userId = user.id;
  const Decimal = Prisma.Decimal;
  const tipo = payload.tipo;
  const monto = new Decimal(payload.monto);
  const moneda = (payload.moneda || '').toUpperCase();
  const fecha = payload.fecha ? new Date(payload.fecha) : new Date();

  if (tipo === 'transferencia') {
    if (!payload.cuenta_id || !payload.cuenta_destino_id) throw new AppError(400, 'Transferencia requiere cuenta origen y destino');
    if (payload.cuenta_id === payload.cuenta_destino_id) throw new AppError(400, 'La cuenta destino debe ser distinta a la de origen');
  const origen = await assertAccount(userId, payload.cuenta_id);
  const destino = await assertAccount(userId, payload.cuenta_destino_id);
    if (origen.moneda !== destino.moneda) throw new AppError(409, 'Transferencias solo entre cuentas de la misma moneda');
  if (moneda !== origen.moneda) throw new AppError(400, 'La moneda de la transacción debe coincidir con la moneda de las cuentas');
    // En transfer 1 moneda; tasa/base en función de moneda vs base
    const { tasa, monto_base } = ensureRateAndBase(user, moneda, monto, payload.tasa_cambio);

    const tx = await prisma.transacciones.create({
      data: {
        usuario_id: userId,
        tipo,
        monto,
        moneda,
        tasa_cambio: tasa,
        monto_base,
        descripcion: payload.descripcion,
        fecha,
        metadatos: payload.metadatos,
        cuenta_id: origen.id,
        cuenta_destino_id: destino.id,
      },
    });
    return tx;
  }

  // ingreso/egreso
  if (!payload.cuenta_id) throw new AppError(400, 'cuenta_id es requerido');
  const cuenta = await assertAccount(userId, payload.cuenta_id);
  const categoria = payload.categoria_id ? await assertCategory(userId, payload.categoria_id) : null;
  validateCategoryMatchesType(categoria, tipo);
  if (cuenta.moneda !== moneda) throw new AppError(400, 'La moneda de la transacción debe coincidir con la moneda de la cuenta');

  const { tasa, monto_base } = ensureRateAndBase(user, moneda, monto, payload.tasa_cambio);

  const tx = await prisma.transacciones.create({
    data: {
      usuario_id: userId,
      cuenta_id: cuenta.id,
      categoria_id: categoria ? categoria.id : null,
      tipo,
      monto,
      moneda,
      tasa_cambio: tasa,
      monto_base,
      descripcion: payload.descripcion,
      fecha,
      metadatos: payload.metadatos,
    },
  });
  return tx;
}

async function getTransactionsByUserId(userId, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const sortBy = ['fecha', 'monto', 'created_at'].includes(filters.sortBy) ? filters.sortBy : 'fecha';
  const order = filters.order === 'asc' ? 'asc' : 'desc';

  const where = {
    usuario_id: userId,
    ...(filters.tipo ? { tipo: filters.tipo } : {}),
    ...(filters.moneda ? { moneda: filters.moneda.toUpperCase() } : {}),
    ...(filters.cuenta_id ? { cuenta_id: filters.cuenta_id } : {}),
    ...(filters.cuenta_destino_id ? { cuenta_destino_id: filters.cuenta_destino_id } : {}),
    ...(filters.categoria_id ? { categoria_id: filters.categoria_id } : {}),
    ...(filters.search ? { descripcion: { contains: filters.search, mode: 'insensitive' } } : {}),
    ...(filters.from || filters.to
      ? {
          fecha: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
    ...(filters.minAmount || filters.maxAmount
      ? {
          monto: {
            ...(filters.minAmount ? { gte: new Prisma.Decimal(filters.minAmount) } : {}),
            ...(filters.maxAmount ? { lte: new Prisma.Decimal(filters.maxAmount) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.transacciones.findMany({ where, orderBy: { [sortBy]: order }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.transacciones.count({ where }),
  ]);

  return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 };
}

async function getTransactionById(userId, id) {
  const tx = await prisma.transacciones.findFirst({ where: { id, usuario_id: userId } });
  if (!tx) throw new AppError(404, 'Transacción no encontrada');
  return tx;
}

async function updateTransaction(user, id, payload) {
  const userId = user.id;
  const existing = await getTransactionById(userId, id);

  // No permitimos cambiar tipo
  const tipo = existing.tipo;
  const update = {};

  if (payload.fecha) update.fecha = new Date(payload.fecha);
  if (payload.descripcion !== undefined) update.descripcion = payload.descripcion;
  if (payload.metadatos !== undefined) update.metadatos = payload.metadatos;

  // Manejo de cuentas/categoría
  if (tipo === 'transferencia') {
    if (payload.categoria_id != null) throw new AppError(400, 'categoria_id no aplica a transferencias');
    if (payload.cuenta_id || payload.cuenta_destino_id) {
      const origenId = payload.cuenta_id || existing.cuenta_id;
      const destinoId = payload.cuenta_destino_id || existing.cuenta_destino_id;
      if (!origenId || !destinoId) throw new AppError(400, 'Transferencia requiere cuenta origen y destino');
      if (origenId === destinoId) throw new AppError(400, 'La cuenta destino debe ser distinta a la de origen');
      const [origen, destino] = await Promise.all([assertAccount(userId, origenId), assertAccount(userId, destinoId)]);
      if (origen.moneda !== destino.moneda) throw new AppError(409, 'Transferencias solo entre cuentas de la misma moneda');
      update.cuenta_id = origen.id;
      update.cuenta_destino_id = destino.id;
      // Verificar moneda nueva contra cuentas
      const checkMoneda = payload.moneda ? payload.moneda.toUpperCase() : existing.moneda;
      if (checkMoneda !== origen.moneda) throw new AppError(400, 'La moneda de la transacción debe coincidir con la moneda de las cuentas');
    }
  } else {
    if (payload.cuenta_id) {
      const acc = await assertAccount(userId, payload.cuenta_id);
      update.cuenta_id = acc.id;
    }
    if (payload.categoria_id !== undefined) {
      const cat = payload.categoria_id ? await assertCategory(userId, payload.categoria_id) : null;
      validateCategoryMatchesType(cat, tipo);
      update.categoria_id = cat ? cat.id : null;
    }
  }

  // Monto/moneda/tasa y monto_base
  const newMonto = payload.monto != null ? new Prisma.Decimal(payload.monto) : new Prisma.Decimal(existing.monto);
  const newMoneda = payload.moneda ? payload.moneda.toUpperCase() : existing.moneda;
  // Check moneda vs cuenta(s)
  if (tipo === 'transferencia') {
    const origenId = update.cuenta_id || existing.cuenta_id;
    const destinoId = update.cuenta_destino_id || existing.cuenta_destino_id;
    const [origen, destino] = await Promise.all([assertAccount(userId, origenId), assertAccount(userId, destinoId)]);
    if (origen.moneda !== destino.moneda) throw new AppError(409, 'Transferencias solo entre cuentas de la misma moneda');
    if (newMoneda !== origen.moneda) throw new AppError(400, 'La moneda de la transacción debe coincidir con la moneda de las cuentas');
  } else {
    const cuentaId = update.cuenta_id || existing.cuenta_id;
    const acc = await assertAccount(userId, cuentaId);
    if (newMoneda !== acc.moneda) throw new AppError(400, 'La moneda de la transacción debe coincidir con la moneda de la cuenta');
  }
  const tasaEntrada = payload.tasa_cambio != null ? payload.tasa_cambio : existing.tasa_cambio;
  const { tasa, monto_base } = ensureRateAndBase(user, newMoneda, newMonto, tasaEntrada);
  update.monto = newMonto;
  update.moneda = newMoneda;
  update.tasa_cambio = tasa;
  update.monto_base = monto_base;

  const updated = await prisma.transacciones.update({ where: { id }, data: update });
  return updated;
}

async function deleteTransaction(userId, id) {
  await getTransactionById(userId, id);
  await prisma.transacciones.delete({ where: { id } });
}

// Reports
async function summary(userId, { from, to } = {}) {
  const where = {
    usuario_id: userId,
    ...(from || to
      ? {
          fecha: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };
  const data = await prisma.transacciones.groupBy({
    by: ['tipo'],
    where,
    _sum: { monto_base: true },
  });
  const sum = Object.fromEntries(data.map((d) => [d.tipo, d._sum.monto_base || new Prisma.Decimal(0)]));
  const ingresos = sum.ingreso || new Prisma.Decimal(0);
  const egresos = sum.egreso || new Prisma.Decimal(0);
  const neto = ingresos.sub(egresos);
  return { ingresos, egresos, neto };
}

async function byCategory(userId, { from, to } = {}) {
  const where = {
    usuario_id: userId,
    categoria_id: { not: null },
    ...(from || to
      ? {
          fecha: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };
  const rows = await prisma.transacciones.groupBy({ by: ['categoria_id'], where, _sum: { monto_base: true }, _count: { _all: true } });
  // Join with categories
  const ids = rows.map((r) => r.categoria_id);
  const cats = await prisma.categorias.findMany({ where: { id: { in: ids } } });
  const map = new Map(cats.map((c) => [c.id, c]));
  return rows.map((r) => ({ categoria: map.get(r.categoria_id), total_base: r._sum.monto_base, count: r._count._all }));
}

async function byAccount(userId, { from, to } = {}) {
  const where = {
    usuario_id: userId,
    ...(from || to
      ? {
          fecha: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };
  const rows = await prisma.transacciones.groupBy({ by: ['cuenta_id'], where, _sum: { monto_base: true }, _count: { _all: true } });
  const ids = rows.map((r) => r.cuenta_id);
  const accs = await prisma.cuentas.findMany({ where: { id: { in: ids } } });
  const map = new Map(accs.map((a) => [a.id, a]));
  return rows.map((r) => ({ cuenta: map.get(r.cuenta_id), total_base: r._sum.monto_base, count: r._count._all }));
}

function startOf(date, granularity) {
  const d = new Date(date);
  if (granularity === 'week') {
    const day = d.getUTCDay();
    const diff = (day + 6) % 7; // Monday start
    d.setUTCDate(d.getUTCDate() - diff);
    d.setUTCHours(0, 0, 0, 0);
  } else if (granularity === 'month') {
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
  } else {
    d.setUTCHours(0, 0, 0, 0);
  }
  return d;
}

async function cashflow(userId, { from, to, granularity = 'month' } = {}) {
  const where = {
    usuario_id: userId,
    ...(from || to
      ? {
          fecha: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };
  const txs = await prisma.transacciones.findMany({ where, orderBy: { fecha: 'asc' }, select: { fecha: true, tipo: true, monto_base: true } });
  const buckets = new Map();
  for (const tx of txs) {
    const key = startOf(tx.fecha, granularity).toISOString();
    if (!buckets.has(key)) buckets.set(key, { ingresos: new Prisma.Decimal(0), egresos: new Prisma.Decimal(0) });
    const b = buckets.get(key);
    if (tx.tipo === 'ingreso') b.ingresos = b.ingresos.add(tx.monto_base);
    if (tx.tipo === 'egreso') b.egresos = b.egresos.add(tx.monto_base);
  }
  return Array.from(buckets.entries()).map(([period, { ingresos, egresos }]) => ({ period, ingresos, egresos, neto: ingresos.sub(egresos) }));
}

async function listTransfers(userId, { from, to, cuenta_id } = {}) {
  const where = {
    usuario_id: userId,
    tipo: 'transferencia',
    ...(cuenta_id ? { OR: [{ cuenta_id }, { cuenta_destino_id: cuenta_id }] } : {}),
    ...(from || to
      ? {
          fecha: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };
  const txs = await prisma.transacciones.findMany({ where, orderBy: { fecha: 'desc' } });
  return txs;
}

// Recurring services
async function createRecurring(userId, payload) {
  const acc = await assertAccount(userId, payload.cuenta_id);
  const user = await prisma.usuarios.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Usuario no encontrado');
  if (payload.moneda.toUpperCase() !== user.moneda_base) {
    throw new AppError(400, 'Por ahora solo se permiten recurrentes en moneda base del usuario');
  }
  const cat = payload.categoria_id ? await assertCategory(userId, payload.categoria_id) : null;
  if (cat && cat.tipo === 'transferencia') throw new AppError(400, 'categoria_id inválida para recurrente');

  const data = {
    usuario_id: userId,
    cuenta_id: acc.id,
    categoria_id: cat ? cat.id : null,
    tipo: payload.tipo,
    monto: new Prisma.Decimal(payload.monto),
    moneda: payload.moneda.toUpperCase(),
    descripcion: payload.descripcion,
    frecuencia: payload.frecuencia,
    intervalo: payload.intervalo || 1,
    fecha_inicio: new Date(payload.fecha_inicio),
    fecha_fin: payload.fecha_fin ? new Date(payload.fecha_fin) : null,
    proxima_ejecucion: payload.proxima_ejecucion ? new Date(payload.proxima_ejecucion) : new Date(payload.fecha_inicio),
    is_active: payload.is_active ?? true,
  };

  const rec = await prisma.transacciones_recurrentes.create({ data });
  return rec;
}

async function listRecurring(userId, { is_active } = {}) {
  const where = { usuario_id: userId, ...(is_active == null ? {} : { is_active }) };
  return prisma.transacciones_recurrentes.findMany({ where, orderBy: { proxima_ejecucion: 'asc' } });
}

async function getRecurringById(userId, id) {
  const rec = await prisma.transacciones_recurrentes.findFirst({ where: { id, usuario_id: userId } });
  if (!rec) throw new AppError(404, 'Transacción recurrente no encontrada');
  return rec;
}

async function updateRecurring(userId, id, payload) {
  await getRecurringById(userId, id);
  const data = {};
  if (payload.cuenta_id) {
    const acc = await assertAccount(userId, payload.cuenta_id);
    data.cuenta_id = acc.id;
  }
  if (payload.categoria_id !== undefined) {
    const cat = payload.categoria_id ? await assertCategory(userId, payload.categoria_id) : null;
    if (cat && cat.tipo === 'transferencia') throw new AppError(400, 'categoria_id inválida para recurrente');
    data.categoria_id = cat ? cat.id : null;
  }
  if (payload.monto != null) data.monto = new Prisma.Decimal(payload.monto);
  if (payload.moneda) data.moneda = payload.moneda.toUpperCase();
  if (payload.descripcion !== undefined) data.descripcion = payload.descripcion;
  if (payload.frecuencia) data.frecuencia = payload.frecuencia;
  if (payload.intervalo != null) data.intervalo = payload.intervalo;
  if (payload.fecha_inicio) data.fecha_inicio = new Date(payload.fecha_inicio);
  if (payload.fecha_fin !== undefined) data.fecha_fin = payload.fecha_fin ? new Date(payload.fecha_fin) : null;
  if (payload.proxima_ejecucion) data.proxima_ejecucion = new Date(payload.proxima_ejecucion);
  if (payload.is_active != null) data.is_active = payload.is_active;

  return prisma.transacciones_recurrentes.update({ where: { id }, data });
}

async function deleteRecurring(userId, id) {
  await getRecurringById(userId, id);
  await prisma.transacciones_recurrentes.delete({ where: { id } });
}

function addInterval(date, frecuencia, intervalo) {
  const d = new Date(date);
  switch (frecuencia) {
    case 'daily':
    case 'diaria':
      d.setUTCDate(d.getUTCDate() + intervalo);
      break;
    case 'weekly':
    case 'semanal':
      d.setUTCDate(d.getUTCDate() + 7 * intervalo);
      break;
    case 'monthly':
    case 'mensual':
      d.setUTCMonth(d.getUTCMonth() + intervalo);
      break;
    case 'yearly':
    case 'anual':
      d.setUTCFullYear(d.getUTCFullYear() + intervalo);
      break;
    default:
      d.setUTCMonth(d.getUTCMonth() + intervalo);
  }
  return d;
}

async function runRecurring(user, id) {
  const userId = user.id;
  const rec = await getRecurringById(userId, id);
  if (!rec.is_active) throw new AppError(409, 'La recurrente está inactiva');
  const now = new Date();
  if (rec.proxima_ejecucion && rec.proxima_ejecucion > now) {
    throw new AppError(409, 'Aún no es tiempo de ejecutar esta recurrente');
  }
  // Crear transacción simple (no transferencia) con moneda de la recurrente
  const tx = await createTransaction(user, {
    tipo: rec.tipo,
    monto: rec.monto,
    moneda: rec.moneda,
    cuenta_id: rec.cuenta_id,
    categoria_id: rec.categoria_id || undefined,
    descripcion: rec.descripcion,
    fecha: now.toISOString(),
  });

  const nextDate = addInterval(rec.proxima_ejecucion || rec.fecha_inicio, rec.frecuencia, rec.intervalo || 1);
  const finalNext = rec.fecha_fin && nextDate > rec.fecha_fin ? null : nextDate;
  await prisma.transacciones_recurrentes.update({ where: { id }, data: { proxima_ejecucion: finalNext, is_active: finalNext ? rec.is_active : false } });
  return { tx, next: finalNext };
}

async function toggleRecurring(userId, id) {
  const rec = await getRecurringById(userId, id);
  const updated = await prisma.transacciones_recurrentes.update({ where: { id }, data: { is_active: !rec.is_active } });
  return updated;
}

module.exports = {
  createTransaction,
  getTransactionsByUserId,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  summary,
  byCategory,
  byAccount,
  cashflow,
  listTransfers,
  // recurring
  createRecurring,
  listRecurring,
  getRecurringById,
  updateRecurring,
  deleteRecurring,
  runRecurring,
  toggleRecurring,
};
