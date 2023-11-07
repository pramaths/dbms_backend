const ErrorResponse = require("../utils/errorResponse");
const crypto = require("crypto");
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const sendMail = require("../utils/mailer");
const jwt = require('jsonwebtoken');
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info', 
  format: winston.format.simple(), 
  transports: [
    new winston.transports.Console(), 
    new winston.transports.File({ filename: 'logfile.log' }),
  ],
});
const sendVerificationEmail = async (email, verificationToken,next) => {
  const verificationLink = `http://localhost:8000/api/verifyEmail/${verificationToken}`;

  const mailOptions = {
    from: "testaccout33@gmail.com",
    to: email,
    subject: "Account Verification",
    text: `Please click the following link to verify your email: ${verificationLink}`,
  };
  try {
    await sendMail(mailOptions);
    logger.info("Verification email sent successfully");
  } catch (error) {
    logger.error("Error sending verification email:", error);
  
    next(new Error("Failed to send verification email"));
  
}}
exports.signup = async (req, res, next) => {
    const { username, name, password, email, phone_number } = req.body;
    const userExistQuery = 'SELECT email, is_verified FROM Students WHERE email = ?  LIMIT 1';
    const hashedPassword = await bcrypt.hash(password, 12); 
    pool.query(userExistQuery, [email], async (error, results) => {
      if (error) {
        return next(new ErrorResponse("Database error", 500));
      }
      if (results.length > 0) {
        const user = results[0];
  
        if (user.is_verified) {
          return next(new ErrorResponse("E-mail already exists and is verified", 400));
        } else {
          const verificationToken = crypto.randomBytes(12).toString("hex");
          logger.info("Generated verification token:", verificationToken);
          const updateUserQuery = 'UPDATE Students SET username = ?, name = ?, password = ?, phone_number = ?, verification_token = ? WHERE email = ?';
          pool.query(updateUserQuery, [username, name, hashedPassword, phone_number, verificationToken, email], async (error, results) => {
            if (error) {
              logger.error("error is in signup", error);
              return next(new ErrorResponse("Failed to update user", 500));
            }
  
            await sendVerificationEmail(email, verificationToken).catch(err => {
              logger.error("Error sending verification email:", err);
              next(new ErrorResponse("Failed to send verification email", 500));
            });
  
            res.status(201).json({
              success: true,
              data: "Verification email resent to unverified user."
            });
          });
        }
      } else {
        const verificationToken = crypto.randomBytes(12).toString("hex");
        logger.info("Generated verification token:", verificationToken);
        const createUserQuery = 'INSERT INTO Students (username, name, password, email, phone_number, verification_token) VALUES (?, ?, ?, ?, ?, ?)';
        pool.query(createUserQuery, [username, name, hashedPassword, email, phone_number, verificationToken], async (error, results) => {
          if (error) {
            logger.error("error is in signup", error);
            return next(new ErrorResponse("Failed to create user", 500));
          }
          await sendVerificationEmail(email, verificationToken).catch(err => {
            logger.error("Error sending verification email:", err);
            next(new ErrorResponse("Failed to send verification email", 500));
          });
  
          res.status(201).json({
            success: true,
            data: "User registered, verification email sent."
          });
        });
      }
    });
  };
  

exports.verifyEmail = async (req, res, next) => {

    const { verificationToken } = req.params; 

    const verifyUserQuery = 'UPDATE Students SET is_verified = TRUE, verification_token = NULL WHERE verification_token = ?';
    pool.query(verifyUserQuery, [verificationToken], function (error, results) {
        if (error) {
          return next(new ErrorResponse("Database error", 500));
        }
        if (results.affectedRows === 0) {
          return next(new ErrorResponse("Invalid verification token", 400));
        } else {
          res.status(200).json({
            success: true,
            message: "Email verified successfully",
          });
        }
      });
    };
exports.signin = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ErrorResponse("E-mail and password are required", 400));
    }

    const findUserQuery = 'SELECT * FROM Students WHERE email = ?';   
    
  pool.query(findUserQuery, [email], async (error, results) => {
    if (error) {
      return next(new ErrorResponse("Database error", 500));
    }
    const user = results[0];
    if (!user) {
      return next(new ErrorResponse("Invalid credentials", 400));
    }

    if (!user.is_verified) {
      return next(new ErrorResponse("Email is not verified", 400));
    }

    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      return next(new ErrorResponse("Invalid credentials", 400));
    }
    generateToken(user, 200, res);
  });
};
const generateToken = (user, statusCode, res) => {
    const payload = {
        id: user.id,
        username: user.username
    };
  
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '180d' // 6 months
    });
  
    // Set token to cookie
    const cookieOptions = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 * 6), 
        httpOnly: true 
    };

    if (process.env.NODE_ENV === 'production') {
        cookieOptions.secure = true; 
        cookieOptions.sameSite = 'none'; 
    }
    res.cookie('token', token, cookieOptions);
    res.status(statusCode).json({
        success: true,
        token
    });
};

exports.logout = (req, res, next) => {
  res.clearCookie("token");
  res.status(200).json({
    success: true,
    message: "Logged out",
  });
};

exports.forgotPassword = async (req, res, next) => {
    const { email } = req.body;
    const findUserQuery = 'SELECT * FROM Students WHERE email = ?';
  
    pool.query(findUserQuery, [email], async (error, results) => {
      if (error) {
        return next(new ErrorResponse("Database error", 500));
      }
  
      const user = results[0];
      if (!user) {
        return next(new ErrorResponse("User not found", 404));
      }
  
      const resetToken = crypto.randomBytes(20).toString("hex");
  
      const hashedResetToken = await bcrypt.hash(resetToken, 12);
  
      const resetPasswordQuery = 'UPDATE Students SET reset_password_token = ?, reset_password_expire = ? WHERE email = ?';
      const expireTime = new Date(Date.now() + 3600000); 
  
      pool.query(resetPasswordQuery, [hashedResetToken, expireTime, email], async (error, results) => {
        if (error) {
          return next(new ErrorResponse("Database error", 500));
        }
  
        const resetUrl = `http://localhost:3000/resetpassword/${resetToken}`;
        const mailOptions = {
          from: "testaccout33@gmail.com",
          to: email,
          subject: "Password Reset Request",
          text: `Please click the following link to reset your password: ${resetUrl}`,
        };
  
        await sendMail(mailOptions);
        res.status(200).json({
          success: true,
          message: "Password reset email sent",
        });
      });
    });
  };
  exports.resetPassword = async (req, res, next) => {
    const { resetToken } = req.params;
    const { password } = req.body;
  
    // Again, hash the token to check against the database
    const hashedResetToken = await bcrypt.hash(resetToken, 12);
  
    const findUserQuery = 'SELECT * FROM Students WHERE reset_password_token = ? AND reset_password_expire > NOW()';
    
    pool.query(findUserQuery, [hashedResetToken], async (error, results) => {
      if (error) {
        return next(new ErrorResponse("Database error", 500));
      }
  
      const user = results[0];
      if (!user) {
        return next(new ErrorResponse("Invalid or expired reset token", 400));
      }
  
      const hashedPassword = await bcrypt.hash(password, 12);
  
      const resetPasswordQuery = 'UPDATE Students SET password = ?, reset_password_token = NULL, reset_password_expire = NULL WHERE email = ?';
      
      pool.query(resetPasswordQuery, [hashedPassword, user.email], (error, results) => {
        if (error) {
          return next(new ErrorResponse("Database error", 500));
        }
        res.status(200).json({
          success: true,
          message: "Password reset successfully",
        });
      });
    });
  };


  
exports.changePassword = async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; 
    const findUserQuery = 'SELECT password FROM Students WHERE id = ?';
  
    pool.query(findUserQuery, [userId], async (error, results) => {
      if (error) {
        return next(new ErrorResponse("Database error", 500));
      }
  
      const user = results[0];
      if (!user) {
        return next(new ErrorResponse("User not found", 404));
      }
  
      const isMatched = await bcrypt.compare(currentPassword, user.password);
      if (!isMatched) {
        return next(new ErrorResponse("Current password is incorrect", 400));
      }
  
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      const updatePasswordQuery = 'UPDATE Students SET password = ? WHERE id = ?';
  
      pool.query(updatePasswordQuery, [hashedNewPassword, userId], (error, results) => {
        if (error) {
          return next(new ErrorResponse("Database error", 500));
        }
        res.status(200).json({ message: 'Password changed successfully' });
      });
    });
  };
  
//   exports.deactivateUser = async (req, res, next) => {
//     const { id } = req.params;
  
//     const findUserQuery = 'SELECT is_user_active FROM Students WHERE id = ?';
//     pool.query(findUserQuery, [id], (error, results) => {
//       if (error) {
//         return next(new ErrorResponse("Database error", 500));
//       }
  
//       const user = results[0];
//       if (!user) {
//         return next(new ErrorResponse("User not found", 404));
//       }
  
//       if (!user.is_user_active) {
//         return next(new ErrorResponse("User is already deactivated", 400));
//       }
  
//       const deactivateUserQuery = 'UPDATE Students SET is_user_active = 0 WHERE id = ?';
  
//       pool.query(deactivateUserQuery, [id], (error, results) => {
//         if (error) {
//           return next(new ErrorResponse("Database error", 500));
//         }
//         res.status(200).json({ message: 'User deactivated successfully' });
//       });
//     });
//   };

