const CreateAccountSchema = {
    name: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Name is required'
        },
        isString: true,
        isLength: {
            options: { max: 255 },
            errorMessage: 'Name is too long, maximum 255 characters'
        }
    },
    surname: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Surname is required'
        },
        isString: true,
        isLength: {
            options: { max: 255 },
            errorMessage: 'Surname is too long, maximum 255 characters'
        }
    },
    username: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Username is required'
        },
        isString: true,
        isLength: {
            options: { max: 50 },
            errorMessage: 'Username is too long, maximum 50 characters'
        }
    },
    email: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Email is required'
        },
        isEmail: {
            errorMessage: 'Invalid email format'
        },
    },
    password: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Password is required'
        },
        isString: true,
        isLength: {
            options: { min: 6 },
            errorMessage: 'Password must be at least 6 characters long'
        }
    }
};

const LoginSchema = {
    email: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Email is required'
        },
        isEmail: {
            errorMessage: 'Invalid email format'
        },
    },
    password: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Password is required'
        },
        isString: true,
    }
};

module.exports = { CreateAccountSchema, LoginSchema };