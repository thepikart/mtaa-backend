'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserEvents', {
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
      event_id: {
        type: Sequelize.INTEGER,
        references: { model: "Events", key: "id"}
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserEvents');
  }
};