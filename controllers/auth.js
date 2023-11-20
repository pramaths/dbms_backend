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

const sendVerificationEmail = async (email, verificationToken, next) => {
  const verificationLink = `http://localhost:8000/api/verifyEmail/${verificationToken}`;

  const mailOptions = {
    from: "testaccount33@gmail.com",
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
  }
};
exports.signup = async (req, res, next) => {
  const { username, password, email, phone_number, role } = req.body;

  if (!['Student', 'Developer'].includes(role)) {
      return next(new ErrorResponse("Invalid role specified", 400));
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const verificationToken = crypto.randomBytes(12).toString("hex");

  let userExistQuery = `SELECT email, is_verified FROM ${role}s WHERE email = ? LIMIT 1`;
  let createUserQuery = `INSERT INTO ${role}s (username,password, email, phone_number, verification_token) VALUES (?, ?, ?, ?, ?)`;
  let updateUserQuery = `UPDATE ${role}s SET username = ?, password = ?, phone_number = ?, verification_token = ? WHERE email = ?`;

  try {
      const [existingUsers] = await pool.query(userExistQuery, [email]);
      if (existingUsers.length > 0) {
          const user = existingUsers[0];
          if (user.is_verified) {
              return next(new ErrorResponse("E-mail already exists and is verified", 400));
          }

          await pool.query(updateUserQuery, [username, hashedPassword, phone_number, verificationToken, email]);
          await sendVerificationEmail(email, verificationToken);
          return res.status(201).json({
              success: true,
              message: "Verification email resent to unverified user."
          });
      }

      await pool.query(createUserQuery, [username,hashedPassword, email, phone_number, verificationToken]);
      await sendVerificationEmail(email, verificationToken);

      res.status(201).json({
          success: true,
          message: "User registered, verification email sent."
      });
  } catch (error) {
      logger.error("Signup error:", error);
      return next(new ErrorResponse("Database error", 500));
  }
};



exports.verifyEmail = async (req, res, next) => {
  const { verificationToken } = req.params;

  try {
      let verifyUserQuery = 'UPDATE Students SET is_verified = TRUE, verification_token = NULL WHERE verification_token = ?';
      let [results] = await pool.query(verifyUserQuery, [verificationToken]);

      if (results.affectedRows === 0) {
          verifyUserQuery = 'UPDATE Developers SET is_verified = TRUE, verification_token = NULL WHERE verification_token = ?';
          [results] = await pool.query(verifyUserQuery, [verificationToken]);

          if (results.affectedRows === 0) {
              return next(new ErrorResponse("Invalid verification token", 400));
          }
      }
      // res.status(200).json({
      //     success: true,
      //     message: "Email verified successfully"
      // });
      res.redirect('http://localhost:3000/login');
  } catch (error) {
      console.error("Database error:", error);
      return next(new ErrorResponse("Database error", 500));
  }
};


exports.signin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return next(new ErrorResponse("E-mail and password are required", 400));
  }

  try {
      // First, try to find the user in the Students table
      let findUserQuery = 'SELECT * FROM Students WHERE email = ?';
      let [users] = await pool.query(findUserQuery, [email]);
      let role = 'Student';

      // If not found in Students, try the Developers table
      if (users.length === 0) {
          findUserQuery = 'SELECT * FROM Developers WHERE email = ?';
          [users] = await pool.query(findUserQuery, [email]);
          role = 'Developer';
      }

      // Check if user is found
      if (users.length === 0) {
          return next(new ErrorResponse("Invalid credentials", 400));
      }

      const user = users[0];

      if (!user.is_verified) {
          return next(new ErrorResponse("Email is not verified", 400));
      }

      const isMatched = await bcrypt.compare(password, user.password);
      if (!isMatched) {
          return next(new ErrorResponse("Invalid credentials", 400));
      }

      generateToken(user, role, 200, res);
  } catch (error) {
      console.error("Database error:", error);
      return next(new ErrorResponse("Database error", 500));
  }
};

const generateToken = (user,role,statusCode, res) => {
    const payload = {
        id: user.id,
        username: user.username,
        email:user.email,
        role:role
    };
  
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '180d' // 6 months
    });
  
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

  try {
      // Check in Students table
      let resetPasswordQuery = 'SELECT * FROM Students WHERE email = ?';
      let [users] = await pool.query(resetPasswordQuery, [email]);
      let updateUserQuery = 'UPDATE Students SET reset_password_token = ?, reset_password_expire = ? WHERE email = ?';

      // If not found, check in Developers table
      if (users.length === 0) {
          resetPasswordQuery = 'SELECT * FROM Developers WHERE email = ?';
          [users] = await pool.query(resetPasswordQuery, [email]);
          updateUserQuery = 'UPDATE Developers SET reset_password_token = ?, reset_password_expire = ? WHERE email = ?';
      }

      if (users.length === 0) {
          return next(new ErrorResponse("User not found", 404));
      }

      const resetToken = crypto.randomBytes(20).toString("hex");
      const hashedResetToken = await bcrypt.hash(resetToken, 12);
      const expireTime = new Date(Date.now() + 3600000); // 1 hour from now

      await pool.query(updateUserQuery, [hashedResetToken, expireTime, email]);

      // Send reset password email
      const resetUrl = `http://localhost:3000/resetpassword/${resetToken}`;
      const mailOptions = {
          from: "testaccount33@gmail.com",
          to: email,
          subject: "Password Reset Request",
          text: `Please click the following link to reset your password: ${resetUrl}`,
      };

      await sendMail(mailOptions);
      res.status(200).json({
          success: true,
          message: "Password reset email sent",
      });
  } catch (error) {
      console.error("Forgot password error:", error);
      return next(new ErrorResponse("Database error", 500));
  }
};
exports.resetPassword = async (req, res, next) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  try {
      const hashedResetToken = await bcrypt.hash(resetToken, 12);
      
      let resetPasswordQuery = 'SELECT * FROM Students WHERE reset_password_token = ? AND reset_password_expire > NOW()';
      let [users] = await pool.query(resetPasswordQuery, [hashedResetToken]);

      let updateUserQuery = 'UPDATE Students SET password = ?, reset_password_token = NULL, reset_password_expire = NULL WHERE email = ?';

      if (users.length === 0) {
          resetPasswordQuery = 'SELECT * FROM Developers WHERE reset_password_token = ? AND reset_password_expire > NOW()';
          [users] = await pool.query(resetPasswordQuery, [hashedResetToken]);

          updateUserQuery = 'UPDATE Developers SET password = ?, reset_password_token = NULL, reset_password_expire = NULL WHERE email = ?';

          if (users.length === 0) {
              return next(new ErrorResponse("Invalid or expired reset token", 400));
          }
      }

      const user = users[0];
      const hashedPassword = await bcrypt.hash(password, 12);
      await pool.query(updateUserQuery, [hashedPassword, user.email]);

      res.status(200).json({
          success: true,
          message: "Password reset successfully",
      });
  } catch (error) {
      console.error("Reset password error:", error);
      return next(new ErrorResponse("Database error", 500));
  }
};

  exports.changePassword = async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const token = req.cookies.token; // Assuming the token is stored in cookies

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const userRole = decoded.role; // Extract the role from the token

        const findUserQuery = `SELECT password FROM ${userRole}s WHERE id = ?`;
        const [users] = await pool.query(findUserQuery, [userId]);

        if (users.length === 0) {
            return next(new ErrorResponse("User not found", 404));
        }

        const user = users[0];
        const isMatched = await bcrypt.compare(currentPassword, user.password);
        if (!isMatched) {
            return next(new ErrorResponse("Current password is incorrect", 400));
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        const updatePasswordQuery = `UPDATE ${userRole}s SET password = ? WHERE id = ?`;
        await pool.query(updatePasswordQuery, [hashedNewPassword, userId]);

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error("Change password error:", error);
        return next(new ErrorResponse("Database error", 500));
    }
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

exports.Userinfo=async(req,res,next)=>{
    const token = req.cookies.token;
    console.log("egg",token)
    if (!token) {
        return next(new ErrorResponse("No token provided", 401));
    }
    console.log(process.env.JWT_SECRET)
    let decoded
    try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        let userId = decoded.id;
        const userRole = decoded.role; 
console.log(userId)
        const findUserQuery = `SELECT * FROM ${userRole}s WHERE id = ?`;
        const [users] = await pool.query(findUserQuery, [userId]);

        if (users.length === 0) {
            return next(new ErrorResponse("User not found", 404));
        }

        res.status(200).json({success:true,users});
    } catch (error) {
        console.error("User not found error:", error);
        return next(new ErrorResponse("error", 500));
    }
}