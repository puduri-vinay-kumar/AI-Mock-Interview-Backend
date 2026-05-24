const asyncHandler = require("../middleware/async.middleware");
const { successResponse } = require("../utils/responseHandler");
const { evaluateCode } = require("../services/coding/codeEvaluator");
const { evaluateVerilog } = require("../services/coding/verilogEvaluator");

exports.evaluateGeneralCode = asyncHandler(async (req, res) => {
  const result = await evaluateCode(req.body);

  return successResponse(res, "Code evaluated successfully", {
    evaluation: result,
  });
});

exports.evaluateVerilogCode = asyncHandler(async (req, res) => {
  const result = await evaluateVerilog(req.body);

  return successResponse(res, "Verilog evaluated successfully", {
    evaluation: result,
  });
});
