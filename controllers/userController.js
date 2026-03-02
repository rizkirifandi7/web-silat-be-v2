const { User, AnggotaSilat, sequelize } = require("../models");
const { Op } = require("sequelize");
const { cloudinary } = require("../middleware/uploadMiddleware");

// Helper to sanitize date strings
const sanitizeDate = (dateStr) => {
  if (!dateStr || dateStr === "Invalid date" || dateStr.trim() === "")
    return null;
  return dateStr;
};

// Helper function to generate nomor anggota
const generateNomorAnggota = async (transaction) => {
  const year = new Date().getFullYear();
  const prefix = `PUSAMADA-${year}-`;

  // Get last member number for this year
  const lastAnggota = await AnggotaSilat.findOne({
    where: {
      nomor_anggota: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [["nomor_anggota", "DESC"]],
    transaction,
  });

  let nextNumber = 1;
  if (lastAnggota && lastAnggota.nomor_anggota) {
    const parts = lastAnggota.nomor_anggota.split("-");
    if (parts.length >= 3) {
      const lastNumber = parseInt(parts[2]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

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
        ...user.get({ plain: true }),
        sabuk,
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

// Helper to delete file from Cloudinary based on URL
const deleteCloudinaryFile = async (url) => {
  if (!url) return;
  try {
    const splitUrl = url.split("/");
    const uploadIndex = splitUrl.findIndex((p) => p === "upload");
    if (uploadIndex === -1) return; // Not a standard cloudinary URL

    const folderAndFile = splitUrl.slice(uploadIndex + 2).join("/");
    const publicId = folderAndFile.substring(0, folderAndFile.lastIndexOf("."));

    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      console.log(`[User] Deleted Cloudinary file: ${publicId}`);
    }
  } catch (err) {
    console.error("[User] Cloudinary delete error:", err);
  }
};

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
  const t = await sequelize.transaction();
  try {
    // Support body: { user: {...}, anggota: {...} } OR FormData parsing
    let userBody = req.body.user;
    let anggotaBody = req.body.anggota;

    // Parse JSON if passed as string via FormData
    if (typeof userBody === "string") userBody = JSON.parse(userBody);
    if (typeof anggotaBody === "string") anggotaBody = JSON.parse(anggotaBody);

    let dataUser = userBody || req.body;
    let foto_url = req.file ? req.file.path : null;

    const { nama, email, password, role, no_hp, alamat } = dataUser;

    // Validate required fields
    if (!nama || !email || !password || !role) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Nama, email, password, and role are required",
      });
    }
    if (password.length < 6) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }
    const existingUser = await User.findOne({
      where: { email },
      transaction: t,
    });
    if (existingUser) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Buat user
    const user = await User.create(
      {
        nama,
        email,
        password, // hooks in model will hash this
        role,
        no_hp: no_hp || null,
        alamat: alamat || null,
        foto_url: foto_url || null,
      },
      { transaction: t },
    );

    // Jika role anggota dan ada anggotaBody, buat AnggotaSilat
    let anggota = null;
    if (role === "anggota" && anggotaBody) {
      // Sanitize dates
      if (anggotaBody.tanggal_lahir !== undefined) {
        anggotaBody.tanggal_lahir = sanitizeDate(anggotaBody.tanggal_lahir);
      }
      if (anggotaBody.tanggal_bergabung !== undefined) {
        anggotaBody.tanggal_bergabung = sanitizeDate(
          anggotaBody.tanggal_bergabung,
        );
      }

      // Generate nomor anggota
      const nomor_anggota = await generateNomorAnggota(t);

      anggota = await AnggotaSilat.create(
        {
          userId: user.id,
          nomor_anggota,
          ...anggotaBody,
        },
        { transaction: t },
      );
    }

    await t.commit();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        foto_url: user.foto_url,
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
    if (t) await t.rollback();
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
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    // Support body: { user: {...}, anggota: {...} } OR FormData parsing
    let userBody = req.body.user;
    let anggotaBody = req.body.anggota;

    // Parse JSON if passed as string via FormData
    if (typeof userBody === "string") userBody = JSON.parse(userBody);
    if (typeof anggotaBody === "string") anggotaBody = JSON.parse(anggotaBody);

    let dataUser = userBody || req.body;

    const { nama, email, role, no_hp, alamat, password } = dataUser;

    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check email uniqueness if changed
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: { email },
        transaction: t,
      });
      if (existingUser) {
        await t.rollback();
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
    if (req.file) {
      if (user.foto_url) {
        // Delete the previous photo from Cloudinary
        await deleteCloudinaryFile(user.foto_url);
      }
      updateData.foto_url = req.file.path;
    }
    await user.update(updateData, { transaction: t });

    // Jika role anggota dan ada anggotaBody, update/insert AnggotaSilat
    let anggota = null;
    if (role === "anggota" && anggotaBody) {
      // Sanitize fields before creating or updating
      if (anggotaBody.tanggal_lahir !== undefined) {
        anggotaBody.tanggal_lahir = sanitizeDate(anggotaBody.tanggal_lahir);
      }
      if (anggotaBody.tanggal_bergabung !== undefined) {
        anggotaBody.tanggal_bergabung = sanitizeDate(
          anggotaBody.tanggal_bergabung,
        );
      }

      const {
        tempat_lahir,
        tanggal_lahir,
        tanggal_bergabung,
        jenis_kelamin,
        tingkatan_sabuk,
        status_aktif,
        status_perguruan,
      } = anggotaBody;

      // Note: Only search, if it's created, we must generate an ID
      const existingAnggotaSilat = await AnggotaSilat.findOne({
        where: { userId: user.id },
        transaction: t,
      });

      if (!existingAnggotaSilat) {
        const nomor_anggota = await generateNomorAnggota(t);
        anggota = await AnggotaSilat.create(
          {
            userId: user.id,
            nomor_anggota,
            tempat_lahir,
            tanggal_lahir,
            tanggal_bergabung,
            jenis_kelamin,
            tingkatan_sabuk,
            status_aktif,
            status_perguruan,
          },
          { transaction: t },
        );
      } else {
        await existingAnggotaSilat.update(
          {
            tempat_lahir,
            tanggal_lahir,
            tanggal_bergabung,
            jenis_kelamin,
            tingkatan_sabuk,
            status_aktif,
            status_perguruan,
          },
          { transaction: t },
        );
        anggota = existingAnggotaSilat;
      }
    }

    await t.commit();

    res.json({
      success: true,
      message: "User updated successfully",
      data: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        foto_url: user.foto_url,
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
    if (t) await t.rollback();
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

    // Hapus foto user dari Cloudinary sebelum hapus akun
    if (user.foto_url) {
      await deleteCloudinaryFile(user.foto_url);
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
