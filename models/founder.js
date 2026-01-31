"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Founder extends Model {
    static associate(models) {
      // No associations needed
    }
  }

  Founder.init(
    {
      nama: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      title: {
        type: DataTypes.STRING,
      },
      description: {
        type: DataTypes.TEXT,
      },
      photoUrl: {
        type: DataTypes.TEXT,
        validate: {
          isUrl: true,
        },
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Founder",
      defaultScope: {
        where: { isActive: true },
        order: [["order", "ASC"]],
      },
    },
  );

  return Founder;
};
