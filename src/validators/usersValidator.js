const BankAccountSchema = {
    address: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Address is required'
        },
        isString: true,
    },
    city: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'City is required'
        },
        isString: true,
    },
    zip: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'ZIP code is required'
        },
        isString: true,
        matches: {
            options: [/^\d{5}$/],
            errorMessage: 'ZIP code must be 5 digits',
        }
    },
    country: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Country is required'
        },
        isString: true,
    },
    number: {
        in: ['body'],
        notEmpty: {
            errorMessage: 'Account number is required'
        },
        matches: {
            options: [/^\d{16}$/],
            errorMessage: 'Account number must be 16 digits',
        }
    }
}

const editUserSchema = {
    name: {
        in: ['body'],
        optional: true,
        isString: true,
        isLength: {
            options: { max: 255 },
            errorMessage: 'Name is too long, maximum 255 characters'
        }
    },
    surname: {
        in: ['body'],
        optional: true,
        isString: true,
        isLength: {
            options: { max: 255 },
            errorMessage: 'Surname is too long, maximum 255 characters'
        }
    },
    username: {
        in: ['body'],
        optional: true,
        isString: true,
        isLength: {
            options: { max: 50 },
            errorMessage: 'Username is too long, maximum 50 characters'
        }
    },
    bio: {
        in: ['body'],
        optional: true,
        isString: true,
        isLength: {
            options: { max: 255 },
            errorMessage: 'Bio is too long, maximum 255 characters'
        }
    }
}

const NotificationSchema = {
    my_attendees: {
        in: ['body'],
        optional: true,
        isBoolean: {
            errorMessage: 'my_attendees must be a boolean'
        }
    },
    my_comments: {
        in: ['body'],
        optional: true,
        isBoolean: {
            errorMessage: 'my_comments must be a boolean'
        }
    },
    my_time: {
        in: ['body'],
        optional: true,
        isBoolean: {
            errorMessage: 'my_time must be a boolean'
        }
    },
    reg_attendees: {
        in: ['body'],
        optional: true,
        isBoolean: {
            errorMessage: 'reg_attendees must be a boolean'
        }
    },
    reg_comments: {
        in: ['body'],
        optional: true,
        isBoolean: {
            errorMessage: 'reg_comments must be a boolean'
        }
    },
    reg_time: {
        in: ['body'],
        optional: true,
        isBoolean: {
            errorMessage: 'reg_time must be a boolean'
        }
    }
}

module.exports = {
    BankAccountSchema,
    editUserSchema,
    NotificationSchema
}