const express = require("express");
const userController = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { updateProfileValidator } = require("../validators/auth.validator");

const router = express.Router();

router.use(protect);

router.get("/profile", userController.getProfile);
router.put("/profile", updateProfileValidator, validate, userController.updateProfile);
router.get("/history", userController.getUserHistory);

module.exports = router;
