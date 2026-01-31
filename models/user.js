"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcrypt");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // AnggotaSilat relationship
      User.hasOne(models.AnggotaSilat, {
        foreignKey: "userId",
        as: "anggotaSilat",
      });

      // Event relationships (existing)
      User.hasMany(models.Event, {
        foreignKey: "organizerId",
        as: "organizedEvents",
      });

      User.hasMany(models.EventRegistration, {
        foreignKey: "userId",
        as: "registrations",
      });

      User.hasMany(models.Payment, {
        foreignKey: "userId",
        as: "payments",
      });
    }
  }
  User.init(
    {
      nama: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("admin", "user", "anggota"),
        allowNull: false,
        defaultValue: "user",
      },
      alamat: {
        type: DataTypes.TEXT,
      },
      no_hp: {
        type: DataTypes.STRING,
      },
      foto: {
        type: DataTypes.STRING,
      },
      foto_url: {
        type: DataTypes.TEXT,
      },
    },
    {
      sequelize,
      modelName: "User",
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed("password")) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
      },
    },
  );

  // Instance method to compare password
  User.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  return User;
};
