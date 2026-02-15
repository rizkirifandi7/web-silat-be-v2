// Get user by id (Admin only)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: AnggotaSilat,
          as: "anggotaSilat",
          attributes: [
            "id",
            "nomor_anggota",
            "tingkatan_sabuk",
            "status_aktif",
            "tanggal_lahir",
            "tempat_lahir",
            "jenis_kelamin",
          ],
        },
      ],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    // Gabungkan sabuk ke root agar frontend mudah
    let sabuk = null;
    if (user.anggotaSilat && user.anggotaSilat.tingkatan_sabuk) {
      sabuk = user.anggotaSilat.tingkatan_sabuk;
    }
    res.json({
      success: true,
      data: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        nik: user.nik,
        tempat_lahir: user.anggotaSilat?.tempat_lahir || user.tempat_lahir,
        tanggal_lahir: user.anggotaSilat?.tanggal_lahir || user.tanggal_lahir,
        jenis_kelamin: user.anggotaSilat?.jenis_kelamin || user.jenis_kelamin,
        sabuk,
        no_hp: user.no_hp,
        alamat: user.alamat,
        anggotaSilat: user.anggotaSilat,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user detail",
      error: error.message,
    });
  }
};
const { User, AnggotaSilat } = require("../models");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

// Get all users with pagination and search
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { nama: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password"] },
      include: [
        {
          model: AnggotaSilat,
          as: "anggotaSilat",
          attributes: ["id", "nomor_anggota"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Users fetched successfully",
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
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// Create new user (Admin only, support anggota detail)
exports.createUser = async (req, res) => {
  try {
    // Support body: { user: {...}, anggota: {...} }
    const { user: userBody, anggota: anggotaBody } = req.body;
    let dataUser = userBody || req.body;

    const { nama, email, password, role, no_hp, alamat } = dataUser;

    // Validate required fields
    if (!nama || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, password, and role are required",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Buat user
    const user = await User.create({
      nama,
      email,
      password, // hooks in model will hash this
      role,
      no_hp: no_hp || null,
      alamat: alamat || null,
    });

    // Jika role anggota dan ada anggotaBody, buat AnggotaSilat
    let anggota = null;
    if (role === "anggota" && anggotaBody) {
      anggota = await AnggotaSilat.create({
        userId: user.id,
        ...anggotaBody,
      });
    }

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        anggota: anggota
          ? {
              id: anggota.id,
              nomor_anggota: anggota.nomor_anggota,
              tingkatan_sabuk: anggota.tingkatan_sabuk,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};

// Update user (Admin only, support anggota detail)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Support body: { user: {...}, anggota: {...} }
    const { user: userBody, anggota: anggotaBody } = req.body;
    let dataUser = userBody || req.body;

    const { nama, email, role, no_hp, alamat, password } = dataUser;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check email uniqueness if changed
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }
    }

    const updateData = {
      nama,
      email,
      role,
      no_hp,
      alamat,
    };
    if (password) {
      updateData.password = password; // hooks in model will hash this
    }
    await user.update(updateData);

    // Jika role anggota dan ada anggotaBody, update/insert AnggotaSilat
    let anggota = null;
    if (role === "anggota" && anggotaBody) {
      const { tempat_lahir, tanggal_lahir, jenis_kelamin, tingkatan_sabuk } =
        anggotaBody;
      const [anggotaSilat, created] = await AnggotaSilat.findOrCreate({
        where: { userId: user.id },
        defaults: {
          tempat_lahir,
          tanggal_lahir,
          jenis_kelamin,
          tingkatan_sabuk,
        },
      });
      if (!created) {
        await anggotaSilat.update({
          tempat_lahir,
          tanggal_lahir,
          jenis_kelamin,
          tingkatan_sabuk,
        });
      }
      anggota = anggotaSilat;
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        anggota: anggota
          ? {
              id: anggota.id,
              nomor_anggota: anggota.nomor_anggota,
              tingkatan_sabuk: anggota.tingkatan_sabuk,
            }
          : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};
