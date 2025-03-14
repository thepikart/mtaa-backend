'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Event extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Event.belongsTo(models.User, { foreignKey: "creator_id" });
      Event.hasMany(models.Comment, { foreignKey: "event_id" });
      Event.belongsToMany(models.User, { through: models.UserEvent, foreignKey: "event_id" });
    }
  }
  Event.init({
    title: DataTypes.STRING,
    place: DataTypes.STRING,
    latitude: DataTypes.FLOAT,
    longitude: DataTypes.FLOAT,
    date: DataTypes.DATE,
    category: DataTypes.ENUM('politics', 'sports', 'music', 'technology', 'art', 'other'),
    description: DataTypes.TEXT,
    price: DataTypes.FLOAT,
    photo: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Event',
  });
  return Event;
};