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

const editUserSchema = {
    name: {
        in: ['body'],
        isString: true,
        isLength: {
            options: { max: 255 }
        }
    },
    surname: {
        in: ['body'],
        isString: true,
        isLength: {
            options: { max: 255 }
        }
    },
    username: {
        in: ['body'],
        isString: true,
        isLength: {
            options: { max: 255 }
        }
    },
    bio: {
        in: ['body'],
        isString: true,
        isLength: {
            options: { max: 255 }
        }
    }
}

module.exports = {
    BankAccountSchema,
    editUserSchema
}