const express = require('express');
const router = express.Router();
const projectController = require('../controllers/proposals');

router.post('/proposalforproject/:project_id', projectController.proposalsForProjects);
router.get("/allproposals/:id",projectController.getProposals)
router.post("/project/:projectId/accept-proposal",projectController.acceptProposal)
module.exports = router;
