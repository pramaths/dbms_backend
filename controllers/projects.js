const ErrorResponse = require("../utils/errorResponse");
const crypto = require("crypto");
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const sendMail = require("../utils/mailer");
const jwt = require('jsonwebtoken');
const winston = require('winston');
const multer = require('multer');
const logger = winston.createLogger({
  level: 'info', 
  format: winston.format.simple(), 
  transports: [
    new winston.transports.Console(), 
    new winston.transports.File({ filename: 'logfile.log' }),
  ],
});

const storage = multer.diskStorage({
  destination: function (req,document, cb) {
      cb(null, 'uploads/');
  },
  filename: function (req, document, cb) {
      cb(null, document.fieldname + '-' + Date.now() + '-' + document.originalname);
  }
});

const upload = multer({ storage: storage });
exports.postProject = upload.single('document'), async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
      return next(new ErrorResponse("Authorization token is missing", 401));
  }


  const { title, description, requirements, deadline } = req.body;
  const document = req.file;console.log(title,deadline,description,requirements)


  if (!title || !description) {
      return next(new ErrorResponse("Missing required fields", 400));
  }
console.log(title,deadline,description,requirements)
  try {
      const userQuery = 'SELECT id FROM Students WHERE email = ?';
      const [users] = await pool.query(userQuery, [userEmail]);
     
      const studentId = users[0].id;

      const projectQuery = 'INSERT INTO Projects (student_id, title, description, requirements, deadline) VALUES (?, ?, ?, ?, ?)';
      const [projectResult] = await pool.query(projectQuery, [studentId, title, description, requirements, deadline]);

      if (document) {
          const docQuery = 'INSERT INTO Docs (title, description,file_path) VALUES (?, ?)';
          const [docResult] = await pool.query(docQuery, [document.originalname,document.originalname, document.path]);

          const projectDocQuery = 'INSERT INTO ProjectDocs (project_id, doc_id) VALUES (?, ?)';
          await pool.query(projectDocQuery, [projectResult.insertId, docResult.insertId]);
      }

      res.status(201).json({
          success: true,
          data: {
              id: projectResult.insertId,
              student_id: studentId,
              title,
              description,
              requirements,
              deadline,
              document: file ? file.path : null
          }
      });
  } catch (error) {
      return next(new ErrorResponse("Database error", 500));
  }
};
exports.test = async (req, res) => {
    res.json({ message: "helloo" });
};