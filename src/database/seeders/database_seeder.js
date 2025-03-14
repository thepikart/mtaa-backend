'use strict';

const { faker, fakerSK } = require('@faker-js/faker');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
     await queryInterface.bulkInsert('Users', [
        {
            name: 'Name1',
            surname: 'Surname1',
            username: 'user1',
            email: 'user1@email.com',
            password: 'password1',
            bio: faker.lorem.lines(2),
            photo: faker.image.avatar(),
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ]);

    const fakerUsers = [];
    for (let i = 0; i < 10; i++) {
        fakerUsers.push({
            name: faker.person.firstName(),
            surname: faker.person.lastName(),
            username: faker.internet.username(),
            email: faker.internet.email(),
            password: faker.internet.password(),
            bio: faker.lorem.sentence(),
            photo: faker.image.avatar(),
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
    const usersDB = await queryInterface.bulkInsert('Users', fakerUsers, { returning: true });

    const events = [];
    for (let i = 0; i < 20; i++) {
        events.push({
            title: faker.company.buzzPhrase(),
            place: fakerSK.location.city(),
            latitude: faker.location.latitude(),
            longitude: faker.location.longitude(),
            date: faker.date.future(),
            category: faker.helpers.arrayElement(['politics', 'sports', 'music', 'technology', 'art', 'other']),
            description: faker.lorem.paragraphs({min: 1, max: 4}),
            price: faker.commerce.price({max: 100}),
            photo: faker.image.urlPicsumPhotos(),
            creator_id: faker.helpers.arrayElement(usersDB).id,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
    const eventsDB = await queryInterface.bulkInsert('Events', events, { returning: true });

    for (const user of usersDB) {
        const userEvents = [];
        for (let i = 0; i < 5; i++) {
            userEvents.push({
                user_id: user.id,
                event_id: faker.helpers.arrayElement(eventsDB).id,
                paid: faker.datatype.boolean(),
            });
        }
        await queryInterface.bulkInsert('UserEvents', userEvents);
    }

    const comments = [];
    for (let i = 0; i < 50; i++) {
        comments.push({
            user_id: faker.helpers.arrayElement(usersDB).id,
            event_id: faker.helpers.arrayElement(eventsDB).id,
            content: faker.lorem.sentences({min: 1, max: 3}),
            createdAt: new Date()
        });
    }
    await queryInterface.bulkInsert('Comments', comments);

    const bankAccounts = [];
    for (const user of usersDB) {
        bankAccounts.push({
            user_id: user.id,
            address: faker.location.streetAddress(),
            city: faker.location.city(),
            zip: faker.location.zipCode(),
            number: faker.finance.accountNumber(),
        });
    }
    await queryInterface.bulkInsert('BankAccounts', bankAccounts);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
    await queryInterface.bulkDelete('Events', null, {});
    await queryInterface.bulkDelete('UserEvents', null, {});
    await queryInterface.bulkDelete('Comments', null, {});
    await queryInterface.bulkDelete('BankAccounts', null, {});
  }
};
