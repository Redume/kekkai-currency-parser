const Joi = require('joi');

const currencySchema = Joi.object({
    from_currency: Joi.string().length(3).required().messages({
        'string.base': 'from_currency must be a string',
        'string.length': 'from_currency must be exactly 3 characters long',
        'any.required': 'from_currency is required'
    }),
    conv_currency: Joi.string().length(3).required().messages({
        'string.base': 'conv_currency must be a string',
        'string.length': 'conv_currency must be exactly 3 characters long',
        'any.required': 'conv_currency is required'
    }),
    date: Joi.date().iso().required().messages({
        'date.base': 'date must be a valid ISO date',
        'any.required': 'date is required'
    }),
    rate: Joi.number().precision(6).positive().required().messages({
        'number.base': 'rate must be a number',
        'number.positive': 'rate must be a positive number',
        'number.precision': 'rate must have no more than 6 decimal places',
        'any.required': 'rate is required'
    })
});

async function validateCurrency(data) {
    try {
        const validatedData = await currencySchema.validateAsync(data);
        return validatedData;
    } catch (error) {
        throw new Error(`Validation error \n${JSON.stringify(error.details[0], null, '\t')}`);
    }
}

module.exports = { validateCurrency };
