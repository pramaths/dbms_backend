const ErrorResponse = require("../utils/errorResponse");
const crypto = require("crypto");
const bcrypt = require('bcryptjs');
const sendMail = require("../utils/mailer");
const jwt = require('jsonwebtoken');
const winston = require('winston');
const db = require('../config/db'); // Ensure this path is correct
const logger = winston.createLogger({
  level: 'info', 
  format: winston.format.simple(), 
  transports: [
    new winston.transports.Console(), 
    new winston.transports.File({ filename: 'logfile.log' }),
  ],
});
exports.proposalsForProjects = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
      return next(new ErrorResponse("Authorization token is missing", 401));
  }

  let developerEmail;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(token)
    console.log(decoded)
      developerEmail = decoded.email;
      console.log(developerEmail)
  } catch (error) {
      return next(new ErrorResponse("Token is invalid", 401));
  }
  try {
      const devCheckQuery = 'SELECT * FROM Developers WHERE email = ?';
      const [developer] = await db.query(devCheckQuery, [developerEmail]);
console.log("why ",developer)
      if (developer.length === 0) {
          return next(new ErrorResponse("Access denied: Only developers can submit proposals", 403));
      }

      const { proposal_text, Estimated_cost, Estimated_Time } = req.body;

      if (!proposal_text) {
          return next(new ErrorResponse("Please enter why you are the best for this project", 400));
      }
      const project_id = req.params.project_id || req.body.project_id;
      console.log("hello",project_id)
      const insertProposalQuery = 'INSERT INTO Proposals (project_id, developer_id, proposal_text, Estimated_cost, Estimated_Time) VALUES (?, ?, ?, ?, ?)';
      await db.query(insertProposalQuery, [project_id, developer[0].id, proposal_text, Estimated_cost, Estimated_Time]);

      res.status(201).json({
          success: true,
          message: "Proposal submitted successfully"
      });

  } catch (error) {
      console.error("Database error:", error);
      return next(new ErrorResponse("Database error", 500));
  }
};


exports.getProposals = async (req, res, next) => {
  const projectId = req.params.id;

  if (!projectId) {
      return next(new ErrorResponse("Project ID is required", 400));
  }

  try {
      const getProposalsQuery = `
          SELECT p.*, d.username, d.email,d.bio,d.image_url, d.expertise, d.github_profile, d.Twitter_profile 
          FROM Proposals p 
          JOIN Developers d ON p.developer_id = d.id 
          WHERE p.project_id = ?
      `;
      const [proposals] = await db.query(getProposalsQuery, [projectId]);
      console.log(proposals);
      if (proposals.length === 0) {
          return res.status(200).json({
              success: true,
              message: "No proposals found for this project"
          });
      }

      res.status(200).json({
          success: true,
          data: proposals
      });

  } catch (error) {
      console.error("Database error:", error);
      return next(new ErrorResponse("Database error", 500));
  }
};
exports.acceptProposal = async (req, res, next) => {
    const { proposalId } = req.body;
    const projectId = req.params.projectId;
    const token = req.cookies.token; 
  console.log(proposalId)
  console.log(projectId)
  if (!token) {
    console.log("Token not found in request");
    return next(new ErrorResponse("Token not provided", 401));
}
    if (!proposalId || !projectId) {
      return next(new ErrorResponse("Proposal ID and Project ID are required", 400));
    }
  
    try {
      // Decode the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log(decoded)
      const studentId = decoded.id;
      console.log(studentId)
      const [project] = await db.query('SELECT student_id FROM Projects WHERE id = ?', [projectId]);
      if (project[0].student_id !== studentId) {
        return res.status(403).json({ message: 'Unauthorized to accept this proposal' });
      }
  
      await db.query('CALL AcceptProposal(?, ?)', [proposalId, projectId]);
      res.status(200).json({
        success: true,
        message: "Proposal accepted successfully"
      });
  
    } catch (error) {
      console.error("Error:", error);
      return next(new ErrorResponse("Database error", 500));
    }
  };