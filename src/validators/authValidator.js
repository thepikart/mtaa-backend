const createAccountSchema = {
    name: {
        in: ['body'],
        notEmpty: true,
        isString: true,
        isLength: {
            options: { max: 255 }
        }
    },
    surname: {
        in: ['body'],
        notEmpty: true,
        isString: true,
        isLength: {
            options: { max: 255 }
        }
    },
    username: {
        in: ['body'],
        notEmpty: true,
        isString: true,
        isLength: {
            options: { max: 255 }
        }
    },
    email: {
        in: ['body'],
        notEmpty: true,
        isEmail: true,
        isLength: {
            options: { max: 255 }
        }
    },
    password: {
        in: ['body'],
        notEmpty: true,
        isString: true,
        isLength: {
            errorMessage: 'Password should be at least 6 characters long',
            options: { min: 6, max: 255 }
        }
    }
}

module.exports = { createAccountSchema };