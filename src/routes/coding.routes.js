const express = require("express");

const codingController = require("../controllers/coding.controller");
const { protect } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  evaluateCodeValidator,
  evaluateVerilogValidator,
} = require("../validators/coding.validator");

const router = express.Router();

router.use(protect);

router.post("/evaluate", evaluateCodeValidator, validate, codingController.evaluateGeneralCode);
router.post(
  "/verilog/evaluate",
  evaluateVerilogValidator,
  validate,
  codingController.evaluateVerilogCode
);

module.exports = router;
