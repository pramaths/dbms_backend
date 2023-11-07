const mysql = require('mysql2');
require("dotenv").config();

// Create a connection pool
const pool = mysql.createPool({
    host: "localhost",
    user: `${process.env.MYSQL_USERNAME}`,
    password: `${process.env.MYSQL_PASSWORD}`,
    database: `${process.env.MYSQL_DATABASE_NAME}`,
});

pool.on('error', (err) => {
    console.error('MySQL pool error:', err);
    process.exit(1);
  });
  

module.exports = pool;