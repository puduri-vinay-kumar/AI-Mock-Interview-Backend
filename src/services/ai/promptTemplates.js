const { buildTechnicalQuestionPrompt } = require("../../prompts/technical.prompts");
const { buildHRQuestionPrompt } = require("../../prompts/hr.prompts");
const { buildVLSIQuestionPrompt } = require("../../prompts/vlsi.prompts");
const {
  buildEvaluationPrompt,
  buildFeedbackPrompt,
  buildResumeAnalysisPrompt,
  buildReportPrompt,
} = require("../../prompts/evaluation.prompts");

const getQuestionPrompt = (context) => {
  const roleLower = String(context.role || "").toLowerCase();
  const typeLower = String(context.interviewType || "").toLowerCase();

  if (typeLower === "hr" || typeLower === "behavioral") {
    return buildHRQuestionPrompt(context);
  }

  if (roleLower.includes("vlsi") || context.skills?.some((skill) => /verilog|rtl|asic/i.test(skill))) {
    return buildVLSIQuestionPrompt(context);
  }

  return buildTechnicalQuestionPrompt(context);
};

module.exports = {
  getQuestionPrompt,
  buildEvaluationPrompt,
  buildFeedbackPrompt,
  buildResumeAnalysisPrompt,
  buildReportPrompt,
};
