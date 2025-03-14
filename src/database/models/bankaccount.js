'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BankAccount extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      BankAccount.belongsTo(models.User, { foreignKey: "user_id" });
    }
  }
  BankAccount.init({
    address: DataTypes.STRING,
    city: DataTypes.STRING,
    zip: DataTypes.STRING,
    number: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'BankAccount',
    timestamps: false,
  });
  return BankAccount;
};