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