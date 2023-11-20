const express = require('express');
const router = express.Router();
const editController = require('../controllers/Edit');

router.post('/image',editController.imageUpload );


module.exports = router;
