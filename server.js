const express = require('express');
const bodyParser = require('body-parser');
const db = require('./config/db');
const cors=require("cors")
const morgan=require("morgan");
const cookieParser=require("cookie-parser");
const testDbConnection = require('./utils/dbTest');
const authroutes=require("./routes/auth")
const projectroutes = require('./routes/projects');
const app = express();
app.use(cors())
app.use(express.json());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
testDbConnection();
app.use("/api",authroutes)
app.use("/api", projectroutes);
app.use((err, req, res, next) => {
  logger.error(err.message); // Log the error
  res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Server Error'
  });
});
app.listen(8000, () => {
  console.log('Server is running on port 8000');
});
