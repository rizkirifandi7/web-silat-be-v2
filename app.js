require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const app = express();
const port = process.env.PORT || 8015;

// Import routes
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const anggotaSilatRoutes = require("./routes/anggotaSilatRoutes");
const donationRoutes = require("./routes/donationRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const materialRoutes = require("./routes/materialRoutes");
const aboutRoutes = require("./routes/aboutRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const productRoutes = require("./routes/productRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:3000", "http://localhost:5173"];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Request logging middleware (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Event Management API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      events: "/api/events",
      registrations: "/api/registrations",
      payments: "/api/payments",
      anggota: "/api/anggota",
      donations: "/api/donations",
      gallery: "/api/gallery",
      materials: "/api/materials",
      about: "/api/about",
      products: "/api/products",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/anggota", anggotaSilatRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/about", aboutRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/webhooks", webhookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  // Handle Multer errors (file upload issues)
  if (err instanceof multer.MulterError) {
    let message = "File upload error";
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File terlalu besar. Maksimal 100MB untuk video.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Field file tidak sesuai. Gunakan field 'file'.";
    }
    return res.status(400).json({
      success: false,
      message,
      error: err.message,
      code: err.code,
    });
  }

  // Handle file filter errors from multer (e.g. wrong file type)
  if (
    err.message &&
    (err.message.includes("Only video") ||
      err.message.includes("Only image") ||
      err.message.includes("Only PDF"))
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy: Origin not allowed",
    });
  }

  // Handle JWT errors
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.listen(port, () => {
  console.log(`Event Management API listening on port ${port}`);
  console.log(`API Documentation: http://localhost:${port}/`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
