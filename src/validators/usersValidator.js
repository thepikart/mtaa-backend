const BankAccountSchema = {
    address: {
        in: ['body'],
        notEmpty: true,
        isString: true,
    },
    city: {
        in: ['body'],
        notEmpty: true,
        isString: true,
    },
    zip: {
        in: ['body'],
        notEmpty: true,
        isString: true,
    },
    country: {
        in: ['body'],
        notEmpty: true,
        isString: true,
    },
    number: {
        in: ['body'],
        notEmpty: true,
        isString: true,
    }
}

module.exports = {
    BankAccountSchema
}