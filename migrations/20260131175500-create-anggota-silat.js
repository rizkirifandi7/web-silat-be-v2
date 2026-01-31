"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("AnggotaSilats", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      nomor_anggota: {
        type: Sequelize.STRING,
        unique: true,
        comment: "Auto-generated member ID (e.g., SILAT-2026-0001)",
      },
      tempat_lahir: {
        type: Sequelize.STRING,
      },
      tanggal_lahir: {
        type: Sequelize.DATE,
      },
      jenis_kelamin: {
        type: Sequelize.ENUM("laki-laki", "perempuan"),
      },
      status_perguruan: {
        type: Sequelize.STRING,
        comment: "Perguruan/school affiliation",
      },
      tingkatan_sabuk: {
        type: Sequelize.STRING,
        comment: "Belt level/rank",
      },
      tanggal_bergabung: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      status_aktif: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("AnggotaSilats");
  },
};
