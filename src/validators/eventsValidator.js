const PaymentSchema = {
    cardHolder: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Card holder name is required',
        },
        isString: true,
    },
    cardNumber: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Card number is required',
        },
        matches: {
            options: [/^\d{16}$/],
            errorMessage: 'Card number must be 16 digits',
        },
    },
    cvv: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'CVV is required',
        },
        isLength: {
            options: { min: 3, max: 3 },
            errorMessage: 'CVV must be 3 digits',
        },
    },
    expiration: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Expiration date is required',
        },
        isString: true,
        matches: {
            options: [/^(0[1-9]|1[0-2])\/\d{2}$/],
            errorMessage: 'Expiration date must be in MM/YY format',
        },
    },
};

module.exports = {
    PaymentSchema
}