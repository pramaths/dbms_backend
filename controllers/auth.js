const User = require("../models/user");
const ErrorResponse = require("../utils/errorResponse");
const crypto = require("crypto");
const sendMail = require("../utils/mailer");
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
  const verificationLink = `https://localhost:8000/api/verifyEmail/${verificationToken}`;

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
    const userExistQuery = 'SELECT email FROM Students WHERE email = ? LIMIT 1';
    pool.query(userExistQuery, [email], async (error, results) => {
      if (error) {
        return next(new ErrorResponse("Database error", 500));
      }
      if (results.length > 0) {
        return next(new ErrorResponse("E-mail already exists", 400));
      } else {
        const verificationToken = crypto.randomBytes(20).toString("hex");
        logger.info("Generated verification token:", verificationToken);
        const createUserQuery = 'INSERT INTO Students (username, name, password, email, phone_number, verification_token) VALUES (?, ?, ?, ?, ?, ?)';
        pool.query(createUserQuery, [username, name, password, email, phone_number, verificationToken], async (error, results) => {
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

    const verifyUserQuery = 'UPDATE Students SET is_verified = 1, verification_token = NULL WHERE verification_token = ?';
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

    // Assuming you have a generateToken function that handles token creation
    generateToken(user, 200, res);
  });
};

const generateToken = async (user, statusCode, res) => {
  const token = await user.jwtGenerateToken();

  const options = {
    httpOnly: true,
    expires: new Date(Date.now() + 365*100*24*60*60*1000),
  };
  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({ success: true, token,user});
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

