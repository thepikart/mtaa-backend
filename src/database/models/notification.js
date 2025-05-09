'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Notification.belongsTo(models.User, {foreignKey: "user_id"});
    }
  }
  Notification.init({
    push_token: DataTypes.STRING,
    my_attendees: DataTypes.BOOLEAN,
    my_comments: DataTypes.BOOLEAN,
    my_time: DataTypes.BOOLEAN,
    reg_attendees: DataTypes.BOOLEAN,
    reg_comments: DataTypes.BOOLEAN,
    reg_time: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Notification',
    timestamps: false
  });
  return Notification;
};