const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "testaccout33@gmail.com",
    pass: "rexmriznhrrkegcc",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

let sendMail = (mailOptions) => {
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
  });
};

module.exports = sendMail;
