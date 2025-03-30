'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Comment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Comment.belongsTo(models.User, { foreignKey: "user_id" });
      Comment.belongsTo(models.Event, { foreignKey: "event_id" });
    }
  }
  Comment.init({
    content: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'Comment',
    timestamps: true,
    createdAt: true,
    updatedAt: false,
  });
  return Comment;
};