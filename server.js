const express = require('express');
const bodyParser = require('body-parser');
const db = require('./config/db');
const cors=require("cors")
const authroutes=require("./routes/auth")
const app = express();
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.listen(8000, () => {
  console.log('Server is running on port 8000');
});
