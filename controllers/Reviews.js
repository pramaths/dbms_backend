const ErrorResponse = require("../utils/errorResponse");
const crypto = require("crypto");
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const sendMail = require("../utils/mailer");
const jwt = require('jsonwebtoken');
const winston = require('winston');
const { decode } = require("punycode");
const logger = winston.createLogger({
  level: 'info', 
  format: winston.format.simple(), 
  transports: [
    new winston.transports.Console(), 
    new winston.transports.File({ filename: 'logfile.log' }),
  ],
});
exports.review = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return next(new ErrorResponse("Authorization token is missing", 401));
    }

    let userId, userRole;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        userRole = decoded.role;
    } catch (error) {
        return next(new ErrorResponse("Token is invalid", 401));
    }

    if (userRole !== 'Student') {
        return next(new ErrorResponse("Only students can submit reviews", 403));
    }

    const { project_id, developer_id, rating, review_text } = req.body;
    if (!project_id || !developer_id || !rating || !review_text) {
        return next(new ErrorResponse("Missing required fields", 400));
    }

    try {
        const projectQuery = 'SELECT * FROM Projects WHERE id = ? AND student_id = ?';
        const [project] = await pool.query(projectQuery, [project_id, userId]);

        if (project.length === 0) {
            return next(new ErrorResponse("Project not found or you are not authorized to review this project", 404));
        }

        // Insert review
        const reviewQuery = 'INSERT INTO Reviews (student_id, project_id, developer_id, rating, review_text) VALUES (?, ?, ?, ?, ?)';
        await pool.query(reviewQuery, [userId, project_id, developer_id, rating, review_text]);

        res.status(201).json({
            success: true,
            message: "Review submitted successfully"
        });
    } catch (error) {
        return next(new ErrorResponse("Database error", 500));
    }
};
exports.editReview = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return next(new ErrorResponse("Authorization token is missing", 401));
    }

    let userId, userRole;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        userRole = decoded.role;
    } catch (error) {
        return next(new ErrorResponse("Token is invalid", 401));
    }

    if (userRole !== 'Student') {
        return next(new ErrorResponse("Only students can edit reviews", 403));
    }

    const { review_id, new_review_text } = req.body;
    if (!review_id || !new_review_text) {
        return next(new ErrorResponse("Missing required fields", 400));
    }

    try {
        // Check if the review was made by the student
        const reviewQuery = 'SELECT * FROM Reviews WHERE id = ? AND student_id = ?';
        const [review] = await pool.query(reviewQuery, [review_id, userId]);

        if (review.length === 0) {
            return next(new ErrorResponse("Review not found or you are not authorized to edit this review", 404));
        }

        // Update review
        const updateReviewQuery = 'UPDATE Reviews SET review_text = ? WHERE id = ?';
        await pool.query(updateReviewQuery, [new_review_text, review_id]);

        res.status(200).json({
            success: true,
            message: "Review updated successfully"
        });
    } catch (error) {
        return next(new ErrorResponse("Database error", 500));
    }
};

