const ErrorResponse = require("../utils/errorResponse");
const crypto = require("crypto");
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const sendMail = require("../utils/mailer");
const jwt = require('jsonwebtoken');
const winston = require('winston');
const multer = require('multer');
const { userInfo } = require("os");
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
exports.postProject =async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
      return next(new ErrorResponse("Authorization token is missing", 401));
  }
  try {
    const decoded = jwt.verify(token,process.env.JWT_SECRET);
    userEmail=decoded.email
    console.log(userEmail); 
} catch (error) {
    return next(new ErrorResponse("Invalid or expired token", 401));
}
upload.single('document')(req, res, async (err) => {
  if (err instanceof multer.MulterError) {
      return next(new ErrorResponse(err.message, 500));
  } else if (err) {
      return next(new ErrorResponse("File upload error", 500));
  }

  const { title, description, requirements, deadline,price ,due} = req.body;
  const document = req.file;
  console.log(title, deadline, description, requirements,price);

  if (!title || !description) {
      return next(new ErrorResponse("Missing required fields", 400));
  }

  try {
      const userQuery = 'SELECT id FROM Students WHERE email = ?';
      const [users] = await pool.query(userQuery, [userEmail]);
      const studentId = users[0].id;

      const projectQuery = 'INSERT INTO Projects (student_id, title, description, requirements, deadline,price,due) VALUES (?, ?, ?, ?, ?, ? ,?)';
      const [projectResult] = await pool.query(projectQuery, [studentId, title, description, requirements, deadline,price,due]);

      if (document) {
          const docQuery = 'INSERT INTO Docs (title, description, file_path) VALUES (?, ?, ?)';
          const [docResult] = await pool.query(docQuery, [document.originalname, 'Document related to project', document.path]);

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
              price,
              document: document ? document.path : null
          }
      });
  } catch (error) {
      console.error("Database error:", error);
      return next(new ErrorResponse("Database error", 500));
  }
});
};
exports.getProjectsByStatus = async (req, res, next) => {
    const { status } = req.query; 
  
    if (!status) {
        return next(new ErrorResponse("Status parameter is required", 400));
    }
  
    try {
      const query = `
      SELECT 
          p.*, 
          s.username AS uname, 
          s.email AS student_email,
          s.image_url AS S_image,
          (SELECT COUNT(*) FROM Proposals WHERE project_id = p.id) AS total_proposals,
          (SELECT 
              GROUP_CONCAT(CONCAT_WS(':', id, proposal_text, Estimated_cost, Estimated_Time, status) SEPARATOR ';') 
              FROM Proposals WHERE project_id = p.id) AS proposal_details,
          GROUP_CONCAT(Docs.title SEPARATOR ';') AS docTitles,
          GROUP_CONCAT(Docs.description SEPARATOR ';') AS docDescriptions,
          GROUP_CONCAT(Docs.file_path SEPARATOR ';') AS docFilePaths
      FROM 
          Projects p
      LEFT JOIN 
          ProjectDocs ON p.id = ProjectDocs.project_id
      LEFT JOIN 
          Docs ON ProjectDocs.doc_id = Docs.id
      JOIN 
          Students s ON p.student_id = s.id
      WHERE 
          p.status = ?
      GROUP BY 
          p.id;
      `;
      const [projects] = await pool.query(query, [status]);
      res.status(200.).
        json({
          success: true,
          data: projects
        });
    } catch (error) {
      console.error("Database error:", error);
      return next(new ErrorResponse("Database error", 500));
    }
  };
  
exports.SingleProject = async (req, res, next) => {
    const project_id = req.params.project_id;

    if (!project_id) {
        return next(new ErrorResponse("Project ID is required", 400));
    }

    try {
        const query = `
            SELECT 
                p.*,  
                s.email AS student_email, 
                s.phone_number AS student_phone, 
                s.image_url AS student_image,
                s.github_profile AS student_github,
                s.Twitter_profile AS student_twitter,
                (SELECT COUNT(*) FROM Proposals WHERE project_id = p.id) AS total_proposals,
                (SELECT 
                    GROUP_CONCAT(CONCAT_WS(':', id, proposal_text, Estimated_cost, Estimated_Time, status) SEPARATOR ';') 
                    FROM Proposals WHERE project_id = p.id) AS proposal_details
            FROM 
                Projects p
            JOIN 
                Students s ON p.student_id = s.id
            WHERE 
                p.id = ?;
        `;

        const [projects] = await pool.query(query, [project_id]);

        if (projects.length === 0) {
            return next(new ErrorResponse("Project not found", 404));
        }

        res.status(200).json({
            success: true,
            data: projects[0]
        });
    } catch (error) {
        console.error("Database error:", error);
        return next(new ErrorResponse("Database error", 500));
    }
};

