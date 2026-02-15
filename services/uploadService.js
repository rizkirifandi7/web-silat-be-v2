const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

/**
 * Create shareable link for uploaded file
 * @param {number} fileId - File entry ID from upload response
 * @returns {Promise<Object>} - Shareable link data
 */
const createShareableLink = async (fileId) => {
  try {

    const response = await axios.post(
      `${process.env.EXTERNAL_UPLOAD_API_URL}/${fileId}/shareable-link`,
      {
        allowDownload: false,
        allowEdit: false,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.EXTERNAL_UPLOAD_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    // Return the link object from response
    // API returns: { link: {...}, status: "success" }
    return response.data.link;
  } catch (error) {
    console.error(
      "Shareable link error:",
      error.response?.data || error.message,
    );
    if (error.response) {
      throw new Error(
        `Failed to create shareable link: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
      );
    } else {
      throw new Error("Failed to create shareable link: " + error.message);
    }
  }
};

/**
 * Upload file to external API (cloud.shelterdata.id)
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} - Normalized upload response
 */
const uploadToExternalAPI = async (file) => {
  try {
    const formData = new FormData();

    // Add file to form data
    // If file is in memory (buffer), create a readable stream
    if (file.buffer) {
      formData.append("file", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    } else if (file.path) {
      // If file is on disk, read from path
      formData.append("file", fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    } else {
      throw new Error("Invalid file object: no buffer or path found");
    }

    // Make request to external API
    const response = await axios.post(
      process.env.EXTERNAL_UPLOAD_API_URL,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${process.env.EXTERNAL_UPLOAD_API_TOKEN}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      },
    );

    // Check if upload was successful
    if (response.data.status !== "success") {
      throw new Error("Upload failed: " + JSON.stringify(response.data));
    }

    const fileEntry = response.data.fileEntry;


    // Create shareable link for the uploaded file
    let shareableLink = null;
    let shareableUrl = null;

    try {
      shareableLink = await createShareableLink(fileEntry.id);

      // Check if hash exists in response
      if (shareableLink && shareableLink.hash) {
        shareableUrl = `${process.env.EXTERNAL_UPLOAD_BASE_URL}/drive/s/${shareableLink.hash}`;
        console.log("Shareable URL created:", shareableUrl);
      } else {
        console.warn(
          "Shareable link created but no hash found:",
          shareableLink,
        );
        // Fallback to direct URL
        shareableUrl = `${process.env.EXTERNAL_UPLOAD_BASE_URL}/${fileEntry.url}`;
      }
    } catch (error) {
      console.error(
        "Failed to create shareable link, using direct URL:",
        error.message,
      );
      // Fallback to direct URL if shareable link creation fails
      shareableUrl = `${process.env.EXTERNAL_UPLOAD_BASE_URL}/${fileEntry.url}`;
    }

    // Normalize response data
    const normalizedData = {
      fileUrl: shareableUrl,
      directUrl: `${process.env.EXTERNAL_UPLOAD_BASE_URL}/${fileEntry.url}`,
      fileName: fileEntry.name,
      fileSize: fileEntry.file_size,
      fileType: fileEntry.type,
      mimeType: fileEntry.mime,
      extension: fileEntry.extension,
      fileId: fileEntry.id,
      hash: fileEntry.hash,
      shareableHash: shareableLink?.hash || null,
      shareableLinkId: shareableLink?.id || null,
      allowDownload: shareableLink?.allow_download || true,
      createdAt: fileEntry.created_at,
    };

    // Clean up temporary file if it exists on disk
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return normalizedData;
  } catch (error) {
    // Clean up temporary file on error
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Re-throw with more context
    if (error.response) {
      throw new Error(
        `External API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
      );
    } else if (error.request) {
      throw new Error("No response from external API: " + error.message);
    } else {
      throw new Error("Upload error: " + error.message);
    }
  }
};

module.exports = {
  uploadToExternalAPI,
};
