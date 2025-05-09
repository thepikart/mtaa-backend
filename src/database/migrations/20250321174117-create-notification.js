'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Notifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: "Users", key: "id" }
      },
      push_token: {
        type: Sequelize.STRING,
      },
      my_attendees: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      my_comments: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      my_time: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      reg_attendees: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      reg_comments: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      reg_time: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Notifications');
  }
};