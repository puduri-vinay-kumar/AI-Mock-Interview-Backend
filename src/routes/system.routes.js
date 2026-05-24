const express = require("express");
const systemController = require("../controllers/system.controller");

const router = express.Router();

router.get("/readiness", systemController.getReadiness);

module.exports = router;
