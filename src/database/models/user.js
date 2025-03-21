'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasMany(models.Event, { foreignKey: "creator_id" });
      User.hasMany(models.Comment, { foreignKey: "user_id" });
      User.hasOne(models.BankAccount, { foreignKey: "user_id" });
      User.belongsToMany(models.Event, { through: models.UserEvent, foreignKey: "user_id" });
      User.hasOne(models.Notification, { foreignKey: "user_id" });
    }
  }
  User.init({
    name: DataTypes.STRING,
    surname: DataTypes.STRING,
    username: {type: DataTypes.STRING, unique: true},
    email: {type: DataTypes.STRING, unique: true},
    password: DataTypes.STRING,
    bio: DataTypes.TEXT,
    photo: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};