const express = require('express');
const bodyParser = require('body-parser');
const db = require('./config/db');
const cors=require("cors")
const morgan=require("morgan");
const cookieParser=require("cookie-parser");
const testDbConnection = require('./utils/dbTest');
const authroutes=require("./routes/auth")
const projectroutes = require('./routes/projects');
const proposalforproject=require("./routes/proposals")
const Edit=require("./routes/edit")
const app = express();
const path = require('path');
const http = require('http');
const socketIo = require('./socket'); 
app.use(cors({
  origin: 'http://localhost:3000', // Replace with your frontend's origin
  credentials: true
}));
const server = http.createServer(app);
app.use(morgan('dev'));
const io = socketIo.init(server); 
app.use(express.json());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/images', express.static(path.join(__dirname, 'Images')));
testDbConnection();
app.use("/api",authroutes)
app.use("/api", projectroutes);
app.use("/api", proposalforproject);
app.use("/api", Edit);
app.listen(8000, () => {
  console.log('Server is running on port 8000');
});

module.exports = io;