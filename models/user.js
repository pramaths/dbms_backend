const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const hashPassword = async (password) => {
  return bcrypt.hash(password, 8);
};

const createUser = async (username, name, email, password, phoneNumber) => {
  const hashedPassword = await hashPassword(password);
  const sql = `INSERT INTO Students (username, name, email, password, phone_number) VALUES (?, ?, ?, ?, ?)`;
  return new Promise((resolve, reject) => {
    pool.query(sql, [username, name, email, hashedPassword, phoneNumber], (error, results) => {
      if (error) {
        return reject(error);
      }
      return resolve(results.insertId);
    });
  });
};

// ... Additional functions for login, etc.

module.exports = {
  createUser,
  // ... other exports
};
