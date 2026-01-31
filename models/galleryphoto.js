"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GalleryPhoto extends Model {
    static associate(models) {
      GalleryPhoto.belongsTo(models.User, {
        foreignKey: "uploadedBy",
        as: "uploader",
      });
      GalleryPhoto.belongsTo(models.Event, {
        foreignKey: "eventId",
        as: "event",
      });
    }
  }

  GalleryPhoto.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      description: {
        type: DataTypes.TEXT,
      },
      category: {
        type: DataTypes.ENUM(
          "event",
          "training",
          "competition",
          "ceremony",
          "other",
        ),
        allowNull: false,
        defaultValue: "other",
      },
      photoUrl: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
          isUrl: true,
        },
      },
      thumbnailUrl: {
        type: DataTypes.TEXT,
        validate: {
          isUrl: true,
        },
      },
      uploadedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      eventId: {
        type: DataTypes.INTEGER,
      },
      takenAt: {
        type: DataTypes.DATE,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "GalleryPhoto",
    },
  );

  return GalleryPhoto;
};
