const { z } = require('zod');

const tipoTransaccion = z.enum(['ingreso', 'egreso', 'transferencia']);
const nivelImportanciaGasto = z.enum(['esencial', 'necesario', 'prescindible']);

const createCategorySchema = z.object({
  body: z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    tipo: tipoTransaccion,
    icono: z.string().optional(),
    color: z.string().optional(),
    importancia: nivelImportanciaGasto.optional(),
  }),
});

const updateCategorySchema = z.object({
  body: z.object({
    nombre: z.string().min(1, 'El nombre es requerido').optional(),
    tipo: tipoTransaccion.optional(),
    icono: z.string().optional(),
    color: z.string().optional(),
    importancia: nivelImportanciaGasto.optional(),
  }),
  params: z.object({
    id: z.string().uuid('El ID debe ser un UUID válido'),
  }),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
