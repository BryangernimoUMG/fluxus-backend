const { z } = require('zod');

const tipoCuenta = z.enum(['efectivo', 'banco', 'tarjeta_credito', 'inversion', 'otro']);
const isoCurrency = z
  .string()
  .regex(/^[A-Z]{3}$/i, 'La moneda debe ser un código ISO 4217 de 3 letras')
  .transform((s) => s.toUpperCase());

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toFixed(2) : v))
  .refine((v) => /^-?\d+(\.\d{1,6})?$/.test(v), {
    message: 'Debe ser un número válido',
  });

const createAccountSchema = z.object({
  body: z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    tipo: tipoCuenta,
    moneda: isoCurrency,
    saldo_inicial: decimalString.optional(),
    descripcion: z.string().optional(),
  }),
});

const updateAccountSchema = z.object({
  params: z.object({ id: z.string().uuid('El ID debe ser un UUID válido') }),
  body: z.object({
    nombre: z.string().min(1).optional(),
    tipo: tipoCuenta.optional(),
    moneda: isoCurrency.optional(),
    saldo_inicial: decimalString.optional(),
    descripcion: z.string().optional(),
  }),
});

const listAccountsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1).optional(),
    pageSize: z.coerce.number().int().positive().max(100).default(20).optional(),
    tipo: tipoCuenta.optional(),
    moneda: isoCurrency.optional(),
    search: z.string().optional(),
    sort: z.enum(['created_at', 'nombre']).default('created_at').optional(),
    order: z.enum(['asc', 'desc']).default('desc').optional(),
  }),
});

const getByIdSchema = z.object({
  params: z.object({ id: z.string().uuid('El ID debe ser un UUID válido') }),
});

const getBalanceSchema = z.object({
  params: z.object({ id: z.string().uuid('El ID debe ser un UUID válido') }),
  query: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    includeDetalle: z.coerce.boolean().optional(),
  }),
});

module.exports = {
  createAccountSchema,
  updateAccountSchema,
  listAccountsSchema,
  getByIdSchema,
  getBalanceSchema,
};
