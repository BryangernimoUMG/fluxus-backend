const { z } = require('zod');

const uuid = z.string().uuid();
const tipoTransaccion = z.enum(['ingreso', 'egreso', 'transferencia']);

const baseFilters = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const createTransactionSchema = z.object({
  body: z
    .object({
      tipo: tipoTransaccion,
      monto: z.union([z.number(), z.string()]).transform((v) => (typeof v === 'string' ? Number(v) : v)).refine((n) => Number.isFinite(n) && n > 0, 'monto debe ser > 0'),
      moneda: z.string().length(3).transform((s) => s.toUpperCase()),
      tasa_cambio: z
        .union([z.number(), z.string()])
        .transform((v) => (v === undefined ? undefined : typeof v === 'string' ? Number(v) : v))
        .optional(),
      fecha: z.string().datetime().optional(),
      descripcion: z.string().max(500).optional(),
      metadatos: z.any().optional(),

      cuenta_id: uuid.optional(),
      cuenta_destino_id: uuid.optional(),
      categoria_id: uuid.nullable().optional(),
      deuda_id: z.any().optional(), // no soportado por ahora
    })
    .refine((body) => body.tipo === 'transferencia' ? !!body.cuenta_id && !!body.cuenta_destino_id : !!body.cuenta_id, {
      message: 'cuenta_id es requerido; para transferencias también cuenta_destino_id',
    })
    .refine((body) => body.tipo !== 'transferencia' ? !body.cuenta_destino_id : true, {
      message: 'cuenta_destino_id solo es válido para transferencias',
    })
    .refine((body) => body.tipo !== 'transferencia' ? true : !body.categoria_id, {
      message: 'categoria_id no aplica para transferencias',
    })
    .refine((body) => body.deuda_id == null, { message: 'deuda_id no soportado aún' }),
});

const listTransactionsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    pageSize: z.string().regex(/^\d+$/).transform(Number).optional(),
    tipo: tipoTransaccion.optional(),
    cuenta_id: uuid.optional(),
    cuenta_destino_id: uuid.optional(),
    categoria_id: uuid.optional(),
    moneda: z.string().length(3).transform((s) => s.toUpperCase()).optional(),
    search: z.string().optional(),
    minAmount: z.string().transform(Number).optional(),
    maxAmount: z.string().transform(Number).optional(),
    sortBy: z.enum(['fecha', 'monto', 'created_at']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

const getByIdSchema = z.object({ params: z.object({ id: uuid }) });

// Dedicated transfer creation schema (convenience endpoint)
const createTransferSchema = z.object({
  body: z
    .object({
      tipo: z.literal('transferencia').default('transferencia'),
      monto: z.union([z.number(), z.string()]).transform((v) => (typeof v === 'string' ? Number(v) : v)).refine((n) => Number.isFinite(n) && n > 0, 'monto debe ser > 0'),
      moneda: z.string().length(3).transform((s) => s.toUpperCase()),
      tasa_cambio: z.union([z.number(), z.string()]).transform((v) => (v == null ? undefined : typeof v === 'string' ? Number(v) : v)).optional(),
      fecha: z.string().datetime().optional(),
      descripcion: z.string().max(500).optional(),
      metadatos: z.any().optional(),
      cuenta_id: uuid,
      cuenta_destino_id: uuid,
    })
    .refine((b) => b.cuenta_id !== b.cuenta_destino_id, { message: 'La cuenta destino debe ser distinta a la de origen' }),
});

const updateTransactionSchema = z.object({
  params: z.object({ id: uuid }),
  body: z
    .object({
      // No permitimos cambiar tipo por simplicidad
      monto: z.union([z.number(), z.string()]).transform((v) => (v == null ? undefined : typeof v === 'string' ? Number(v) : v)).optional(),
      moneda: z.string().length(3).transform((s) => s.toUpperCase()).optional(),
      tasa_cambio: z.union([z.number(), z.string()]).transform((v) => (v == null ? undefined : typeof v === 'string' ? Number(v) : v)).optional(),
      fecha: z.string().datetime().optional(),
      descripcion: z.string().max(500).optional(),
      metadatos: z.any().optional(),
      cuenta_id: uuid.optional(),
      cuenta_destino_id: uuid.nullable().optional(),
      categoria_id: uuid.nullable().optional(),
      deuda_id: z.any().optional(),
    })
    .refine((body) => !(body.cuenta_destino_id && body.categoria_id), {
      message: 'categoria_id no aplica cuando se establece cuenta_destino_id (transferencia)',
    })
    .refine((body) => body.deuda_id == null, { message: 'deuda_id no soportado aún' }),
});

const summarySchema = z.object({ query: baseFilters });
const byCategorySchema = z.object({ query: baseFilters });
const byAccountSchema = z.object({ query: baseFilters });
const cashflowSchema = z.object({
  query: baseFilters.extend({ granularity: z.enum(['day', 'week', 'month']).default('month') }),
});
const transfersListSchema = z.object({
  query: baseFilters.extend({ cuenta_id: uuid.optional() }),
});

// Recurring
const frecuenciaEnum = z.enum(['daily', 'weekly', 'monthly', 'yearly', 'diaria', 'semanal', 'mensual', 'anual']);

const createRecurringSchema = z.object({
  body: z
    .object({
      tipo: z.enum(['ingreso', 'egreso']).refine((t) => t !== 'transferencia', 'transferencia no soportada en recurrentes'),
      monto: z.union([z.number(), z.string()]).transform((v) => (typeof v === 'string' ? Number(v) : v)).refine((n) => Number.isFinite(n) && n > 0, 'monto debe ser > 0'),
      moneda: z.string().length(3).transform((s) => s.toUpperCase()),
      descripcion: z.string().max(500).optional(),
      cuenta_id: uuid,
      categoria_id: uuid.optional(),
      deuda_id: z.any().optional(),
      frecuencia: frecuenciaEnum,
      intervalo: z.number().int().positive().default(1),
      fecha_inicio: z.string().datetime(),
      fecha_fin: z.string().datetime().nullable().optional(),
      proxima_ejecucion: z.string().datetime().optional(),
      is_active: z.boolean().optional(),
    })
    .refine((b) => b.deuda_id == null, { message: 'deuda_id no soportado aún' }),
});

const listRecurringSchema = z.object({ query: z.object({ is_active: z.string().transform((v) => v === 'true').optional() }).optional() });
const recurringIdSchema = z.object({ params: z.object({ id: uuid }) });
const updateRecurringSchema = z.object({
  params: z.object({ id: uuid }),
  body: z
    .object({
      // tipo no se cambia para simplificar
      monto: z.union([z.number(), z.string()]).transform((v) => (v == null ? undefined : typeof v === 'string' ? Number(v) : v)).optional(),
      moneda: z.string().length(3).transform((s) => s.toUpperCase()).optional(),
      descripcion: z.string().max(500).optional(),
      cuenta_id: uuid.optional(),
      categoria_id: uuid.optional().nullable(),
      deuda_id: z.any().optional(),
      frecuencia: frecuenciaEnum.optional(),
      intervalo: z.number().int().positive().optional(),
      fecha_inicio: z.string().datetime().optional(),
      fecha_fin: z.string().datetime().nullable().optional(),
      proxima_ejecucion: z.string().datetime().optional(),
      is_active: z.boolean().optional(),
    })
    .refine((b) => b.deuda_id == null, { message: 'deuda_id no soportado aún' }),
});

module.exports = {
  createTransactionSchema,
  listTransactionsSchema,
  getByIdSchema,
  updateTransactionSchema,
  createTransferSchema,
  summarySchema,
  byCategorySchema,
  byAccountSchema,
  cashflowSchema,
  transfersListSchema,
  createRecurringSchema,
  listRecurringSchema,
  recurringIdSchema,
  updateRecurringSchema,
};
