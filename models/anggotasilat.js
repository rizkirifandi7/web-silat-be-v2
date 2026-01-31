"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class AnggotaSilat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // User relationship
      AnggotaSilat.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }
  AnggotaSilat.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      nomor_anggota: {
        type: DataTypes.STRING,
        unique: true,
      },
      tempat_lahir: {
        type: DataTypes.STRING,
      },
      tanggal_lahir: {
        type: DataTypes.DATE,
      },
      jenis_kelamin: {
        type: DataTypes.ENUM("laki-laki", "perempuan"),
      },
      status_perguruan: {
        type: DataTypes.STRING,
      },
      tingkatan_sabuk: {
        type: DataTypes.STRING,
      },
      tanggal_bergabung: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      status_aktif: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "AnggotaSilat",
    },
  );
  return AnggotaSilat;
};
