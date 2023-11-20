// ImageUploadController.js

const crypto = require("crypto");
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'Images/'); // Ensure this directory exists
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

exports.imageUpload = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return next(new ErrorResponse("Authorization token is missing", 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(new ErrorResponse("Invalid or expired token", 401));
  }

  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return next(new ErrorResponse(err.message, 500));
    } else if (err) {
      return next(new ErrorResponse("File upload error", 500));
    }

    const file = req.file;
    if (!file) {
      return res.status(400).send('Please upload a file.');
    }
    const imagePath = '/Images/' + file.filename;
    const userId = decoded.id;
    const userRole = decoded.role;

    try {
      const updateQuery = `UPDATE ${userRole}s SET image_url = ? WHERE id = ?`;
      await pool.query(updateQuery, [imagePath, userId]);
      res.status(200).json({ success: true, path: imagePath });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).send('Database error');
    }
  });
};
