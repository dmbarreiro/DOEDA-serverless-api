const Joi = require('joi');

// Query parameters validation
export const queryStringSchema = Joi.object({
  'min-run-size': Joi.string()
    .regex(/^\d+$/)
    .max(2),
  
  'max-run-size': Joi.string()
    .regex(/^\d+$/)
    .max(2),

  multilevel: Joi.boolean(),

  keywords: Joi.array()
    .unique()
    .items(
      Joi.string()
        .insensitive()
        .pattern(/^[a-zA-Z\-]+$/, 'keywords')
    ),
  
  page: Joi.string()
    .regex(/^\d+$/)
    .max(3),
  
  limit: Joi.string()
    .regex(/^\d+$/)
    .max(2),
  
  fields: Joi.array()
    .unique()
    .items(
      Joi.string()
        .insensitive()
        .pattern(/^[a-zA-Z\-_]+$/, 'fields')
    ),
})
  .required();

// Request body validation
export default {
  type: "object",
  properties: {
    name: { type: 'string' }
  },
  required: ['name']
} as const;
