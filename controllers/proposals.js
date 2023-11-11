const ErrorResponse = require("../utils/errorResponse");
const crypto = require("crypto");
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const sendMail = require("../utils/mailer");
const jwt = require('jsonwebtoken');
const winston = require('winston');
const db = require('../config/db'); // Ensure this path is correct
const jwt = require('jsonwebtoken');
const logger = winston.createLogger({
  level: 'info', 
  format: winston.format.simple(), 
  transports: [
    new winston.transports.Console(), 
    new winston.transports.File({ filename: 'logfile.log' }),
  ],
});
exports.proposalsForProjects=async(req,res,next)=>{
const token=req.cookies.token;
if(!token){
    return next(new ErrorResponse("Authorization token is missing", 401))
}
let DeveloperEmail;
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  DeveloperEmail = decoded.email; 
} catch (error) {
  return next(new ErrorResponse("Token is invalid", 401));
}
const{proposal_text,Estimated_cost,Estimated_Time}=req.body
if(!proposal_text){
    return next(new ErrorResponse("please enter why u are best",404))
}


}