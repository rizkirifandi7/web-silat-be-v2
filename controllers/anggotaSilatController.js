const { AnggotaSilat, User } = require("../models");
const { Op } = require("sequelize");

// Helper function to generate nomor anggota
const generateNomorAnggota = async () => {
  const year = new Date().getFullYear();
  const prefix = `SILAT-${year}-`;

  // Get last member number for this year
  const lastAnggota = await AnggotaSilat.findOne({
    where: {
      nomor_anggota: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [["nomor_anggota", "DESC"]],
  });

  let nextNumber = 1;
  if (lastAnggota) {
    const lastNumber = parseInt(lastAnggota.nomor_anggota.split("-")[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

// Create anggota profile
exports.createAnggota = async (req, res) => {
  try {
    const {
      userId,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      status_perguruan,
      tingkatan_sabuk,
    } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    // Check if user exists and has role 'anggota'
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "anggota") {
      return res.status(400).json({
        success: false,
        message: 'User must have role "anggota" to create anggota profile',
      });
    }

    // Check if anggota profile already exists
    const existingAnggota = await AnggotaSilat.findOne({ where: { userId } });
    if (existingAnggota) {
      return res.status(400).json({
        success: false,
        message: "Anggota profile already exists for this user",
      });
    }

    // Generate nomor anggota
    const nomor_anggota = await generateNomorAnggota();

    // Create anggota profile
    const anggota = await AnggotaSilat.create({
      userId,
      nomor_anggota,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      status_perguruan,
      tingkatan_sabuk,
      tanggal_bergabung: new Date(),
    });

    // Fetch with user data
    const anggotaWithUser = await AnggotaSilat.findByPk(anggota.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nama", "email", "alamat", "no_hp", "foto_url"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Anggota profile created successfully",
      data: anggotaWithUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating anggota profile",
      error: error.message,
    });
  }
};

// Get all anggota with filtering
exports.getAllAnggota = async (req, res) => {
  try {
    const {
      status_aktif,
      tingkatan_sabuk,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};

    if (status_aktif !== undefined)
      where.status_aktif = status_aktif === "true";
    if (tingkatan_sabuk) where.tingkatan_sabuk = tingkatan_sabuk;

    const offset = (page - 1) * limit;

    const { count, rows } = await AnggotaSilat.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nama", "email", "alamat", "no_hp", "foto_url"],
          where: search
            ? {
                nama: { [Op.iLike]: `%${search}%` },
              }
            : undefined,
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching anggota",
      error: error.message,
    });
  }
};

// Get anggota by ID
exports.getAnggotaById = async (req, res) => {
  try {
    const { id } = req.params;

    const anggota = await AnggotaSilat.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "nama",
            "email",
            "role",
            "alamat",
            "no_hp",
            "foto",
            "foto_url",
          ],
        },
      ],
    });

    if (!anggota) {
      return res.status(404).json({
        success: false,
        message: "Anggota not found",
      });
    }

    res.json({
      success: true,
      data: anggota,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching anggota",
      error: error.message,
    });
  }
};

// Get anggota by user ID
exports.getAnggotaByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const anggota = await AnggotaSilat.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "nama",
            "email",
            "role",
            "alamat",
            "no_hp",
            "foto",
            "foto_url",
          ],
        },
      ],
    });

    if (!anggota) {
      return res.status(404).json({
        success: false,
        message: "Anggota profile not found for this user",
      });
    }

    res.json({
      success: true,
      data: anggota,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching anggota",
      error: error.message,
    });
  }
};

// Update anggota profile
exports.updateAnggota = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow updating userId or nomor_anggota
    delete updateData.userId;
    delete updateData.nomor_anggota;

    const anggota = await AnggotaSilat.findByPk(id);

    if (!anggota) {
      return res.status(404).json({
        success: false,
        message: "Anggota not found",
      });
    }

    await anggota.update(updateData);

    // Fetch updated data with user
    const updatedAnggota = await AnggotaSilat.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nama", "email", "alamat", "no_hp", "foto_url"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Anggota profile updated successfully",
      data: updatedAnggota,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating anggota",
      error: error.message,
    });
  }
};

// Soft delete anggota (set status_aktif to false)
exports.deleteAnggota = async (req, res) => {
  try {
    const { id } = req.params;

    const anggota = await AnggotaSilat.findByPk(id);

    if (!anggota) {
      return res.status(404).json({
        success: false,
        message: "Anggota not found",
      });
    }

    await anggota.update({ status_aktif: false });

    res.json({
      success: true,
      message: "Anggota deactivated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting anggota",
      error: error.message,
    });
  }
};

// Get anggota statistics
exports.getAnggotaStats = async (req, res) => {
  try {
    const totalAnggota = await AnggotaSilat.count();
    const activeAnggota = await AnggotaSilat.count({
      where: { status_aktif: true },
    });
    const inactiveAnggota = await AnggotaSilat.count({
      where: { status_aktif: false },
    });

    // Count by belt level
    const byBelt = await AnggotaSilat.findAll({
      attributes: [
        "tingkatan_sabuk",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["tingkatan_sabuk"],
      raw: true,
    });

    // Count by gender
    const byGender = await AnggotaSilat.findAll({
      attributes: [
        "jenis_kelamin",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["jenis_kelamin"],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        total: totalAnggota,
        active: activeAnggota,
        inactive: inactiveAnggota,
        byBelt,
        byGender,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};

// Verify anggota by ID (Public)
exports.verifyAnggota = async (req, res) => {
  try {
    const { id } = req.params;

    const anggota = await User.findByPk(id, {
      include: [
        {
          model: AnggotaSilat,
          as: "anggotaSilat",
          attributes: [
            "nomor_anggota",
            "status_aktif",
            "tingkatan_sabuk",
            "tanggal_bergabung",
          ],
        },
      ],
    });

    if (!anggota) {
      return res.status(404).json({
        success: false,
        message: "Anggota tidak ditemukan",
      });
    }

    const detail = anggota.anggotaSilat;

    if (!detail) {
      return res.status(404).json({
        success: false,
        message: "Profil anggota tidak ditemukan untuk user ini",
      });
    }

    if (!detail.status_aktif) {
      return res.status(400).json({
        success: false,
        message: "Anggota tersebut sudah tidak aktif",
        data: {
          nama: anggota.nama,
          nomor_anggota: detail.nomor_anggota,
          status_aktif: false,
        },
      });
    }

    res.json({
      success: true,
      message: "Data anggota terverifikasi",
      data: {
        id: anggota.id,
        nomor_anggota: detail.nomor_anggota,
        nama: anggota.nama,
        foto_url: anggota.foto_url,
        tingkatan_sabuk: detail.tingkatan_sabuk,
        status_aktif: detail.status_aktif,
        tanggal_bergabung: detail.tanggal_bergabung,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying anggota",
      error: error.message,
    });
  }
};
