const {
  createStructuredResponse,
  isAIProviderConfigured,
} = require("./provider.service");
const { buildFeedbackPrompt } = require("./promptTemplates");
const logger = require("../../utils/logger");

const feedbackSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    suggestedLearnings: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "strengths", "weaknesses", "suggestedLearnings"],
};

const dedupe = (items = []) => Array.from(new Set(items.filter(Boolean))).slice(0, 6);

const fallbackFeedback = ({ role, interviewType, evaluations }) => {
  const strengths = dedupe(evaluations.flatMap((item) => item.strengths));
  const weaknesses = dedupe(evaluations.flatMap((item) => item.weaknesses));
  const suggestedLearnings = dedupe(evaluations.flatMap((item) => item.suggestions));
  const averageScore = evaluations.length
    ? evaluations.reduce((sum, item) => sum + item.score, 0) / evaluations.length
    : 0;

  return {
    summary: `The ${role} ${interviewType} interview shows a current average score of ${averageScore.toFixed(
      1
    )}. The candidate demonstrates workable fundamentals with clear next steps for improvement.`,
    strengths: strengths.length ? strengths : ["Shows intent to solve the problem"],
    weaknesses: weaknesses.length ? weaknesses : ["Needs more detailed explanations"],
    suggestedLearnings: suggestedLearnings.length
      ? suggestedLearnings
      : ["Practice structured mock interviews and review fundamentals"],
  };
};

const generateFeedback = async ({ role, interviewType, evaluations }) => {
  const prompt = buildFeedbackPrompt({
    role,
    interviewType,
    answersCount: evaluations.length,
  });

  if (isAIProviderConfigured()) {
    try {
      const aiResult = await createStructuredResponse({
        name: "interview_feedback",
        schema: feedbackSchema,
        instructions: prompt,
        input: evaluations,
      });

      if (aiResult) {
        return aiResult;
      }
    } catch (error) {
      logger.warn(`Feedback generation fallback engaged: ${error.message}`);
    }
  }

  return fallbackFeedback({ role, interviewType, evaluations });
};

module.exports = {
  generateFeedback,
};
