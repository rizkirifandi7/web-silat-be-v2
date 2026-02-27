const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for images (Gallery, About, Donation Campaign)
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "silat/images",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1920, height: 1080, crop: "limit" }],
  },
});

// Storage for videos (Materials) - use memory storage for external API upload
const videoStorage = multer.memoryStorage();

// Storage for documents (Materials) - use memory storage for external API upload
const documentStorage = multer.memoryStorage();

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// File filter for videos
const videoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed!"), false);
  }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, DOCX, PPT, PPTX files are allowed!"), false);
  }
};

// Multer instances
const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Unified material upload (accepts both video and document)
const uploadMaterial = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept both video and document files
    const videoMimes = [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/webm",
    ];
    const documentMimes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    const allAllowedMimes = [...videoMimes, ...documentMimes];

    if (allAllowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only video (MP4, MOV, AVI, MKV, WEBM) and document (PDF, DOC, DOCX, PPT, PPTX) files are allowed!",
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB (max for videos)
  },
});

// Export multer instances
module.exports = {
  uploadImage,
  uploadVideo,
  uploadDocument,
  uploadMaterial,
  cloudinary,
};
