"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("LearningMaterials", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
        comment: "Primary key",
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Judul materi",
      },
      description: {
        type: Sequelize.TEXT,
        comment: "Deskripsi materi",
      },
      type: {
        type: Sequelize.ENUM("video", "document", "pdf"),
        allowNull: false,
        comment: "Tipe materi (video, dokumen, pdf)",
      },
      category: {
        type: Sequelize.ENUM(
          "teknik_dasar",
          "jurus",
          "sejarah",
          "teori",
          "peraturan",
          "lainnya",
        ),
        allowNull: false,
        defaultValue: "lainnya",
        comment: "Kategori materi",
      },
      sabuk: {
        type: Sequelize.ENUM(
          "Belum punya",
          "LULUS Binfistal",
          "Sabuk Putih",
          "Sabuk Kuning",
          "Sabuk Hijau",
          "Sabuk Merah",
          "Sabuk Hitam Wiraga 1",
          "Sabuk Hitam Wiraga 2",
          "Sabuk Hitam Wiraga 3",
        ),
        allowNull: false,
        defaultValue: "Belum punya",
        comment: "Tingkatan sabuk minimal akses",
      },
      fileUrl: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "URL file materi",
      },
      fileType: {
        type: Sequelize.STRING,
        comment: "Tipe file (ekstensi)",
      },
      fileId: {
        type: Sequelize.STRING,
        comment: "ID file di cloud (jika ada)",
      },
      thumbnailUrl: {
        type: Sequelize.TEXT,
        comment: "URL thumbnail (jika video)",
      },
      fileSize: {
        type: Sequelize.INTEGER,
        comment: "Ukuran file (byte)",
      },
      duration: {
        type: Sequelize.INTEGER,
        comment: "Durasi (detik, jika video)",
      },
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
        comment: "User pengunggah",
      },
      accessLevel: {
        type: Sequelize.ENUM("anggota_only", "admin_only"),
        allowNull: false,
        defaultValue: "anggota_only",
        comment: "Hak akses materi",
      },
      viewCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Jumlah view",
      },
      downloadCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Jumlah download",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Status aktif/tidak",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        comment: "Waktu dibuat",
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        comment: "Waktu update terakhir",
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("LearningMaterials");
  },
};
