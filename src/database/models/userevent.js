'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserEvent extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      UserEvent.belongsTo(models.Event, { foreignKey: 'event_id' });
      UserEvent.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }
  UserEvent.init({
    paid: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'UserEvent',
    timestamps: false,
  });
  return UserEvent;
};