const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projects');

router.post('/postproject', projectController.postProject);

router.get('/projects',projectController.getProjectsByStatus);
router.get('/project/:project_id',projectController.SingleProject);

module.exports = router;
