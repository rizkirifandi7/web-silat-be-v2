"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AboutSection extends Model {
    static associate(models) {
      AboutSection.belongsTo(models.User, {
        foreignKey: "updatedBy",
        as: "editor",
      });
    }
  }

  AboutSection.init(
    {
      sejarah: {
        type: DataTypes.TEXT,
      },
      visi: {
        type: DataTypes.TEXT,
      },
      misi: {
        type: DataTypes.TEXT,
      },
      filosofiLogo: {
        type: DataTypes.TEXT,
      },
      logoUrl: {
        type: DataTypes.TEXT,
        validate: {
          isUrl: true,
        },
      },
      updatedBy: {
        type: DataTypes.INTEGER,
      },
    },
    {
      sequelize,
      modelName: "AboutSection",
    },
  );

  return AboutSection;
};
