const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projects');

router.post('/postproject', projectController.postProject);
router.get('/test',projectController.test)

module.exports = router;
