const express = require("express");
const reportController = require("../controllers/report.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);

router.get("/user/:userId", reportController.getReportsByUserId);
router.get("/:id", reportController.getReportById);

module.exports = router;
