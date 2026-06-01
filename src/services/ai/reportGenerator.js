const {
  createStructuredResponse,
  isAIProviderConfigured,
} = require("./provider.service");
const { buildReportPrompt } = require("./promptTemplates");
const { calculateWeightedScores } = require("./scoringEngine");
const logger = require("../../utils/logger");

const reportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    detailedAnalysis: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        communicationNotes: { type: "string" },
        technicalNotes: { type: "string" },
        behavioralNotes: { type: "string" },
        improvementPlan: { type: "string" },
        percentileEstimate: { type: "number" },
        overallRating: { type: "string" },
      },
      required: [
        "summary",
        "communicationNotes",
        "technicalNotes",
        "behavioralNotes",
        "improvementPlan",
        "percentileEstimate",
        "overallRating",
      ],
    },
    topicScores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          topic: { type: "string" },
          score: { type: "number" },
          comments: { type: "string" },
        },
        required: ["topic", "score", "comments"],
      },
    },
    learningRecommendations: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["detailedAnalysis", "topicScores", "learningRecommendations"],
};

const buildFallbackTopicScores = (answers = []) =>
  answers.map((item) => ({
    topic: item.evaluation?.topic || "general",
    score: item.evaluation?.score || 0,
    comments: item.evaluation?.suggestions?.[0] || "Continue practicing this area.",
  }));

const buildFallbackReport = ({ interview, scores }) => ({
  detailedAnalysis: {
    summary:
      interview.feedback.summary ||
      "The interview showed current strengths alongside clear opportunities for more structured responses.",
    communicationNotes: `Communication score indicates ${scores.communication.toFixed(
      1
    )} / 100 with room to improve answer crispness and storytelling.`,
    technicalNotes: `Technical performance currently stands at ${scores.technicalKnowledge.toFixed(
      1
    )} / 100 based on answer depth and conceptual accuracy.`,
    behavioralNotes:
      "Behavioral indicators suggest the candidate benefits from sharper ownership examples and better articulation of impact.",
    improvementPlan:
      "Revise core concepts, rehearse role-specific examples, and practice timed mocks with verbal explanations.",
    percentileEstimate: scores.percentileEstimate,
    overallRating: scores.overallRating,
  },
  topicScores: buildFallbackTopicScores(interview.answers),
  learningRecommendations: interview.feedback.suggestedLearnings || [],
});

const generateInterviewReport = async ({ interview }) => {
  const evaluations = interview.answers.map((answer) => answer.evaluation || {});
  const scores = calculateWeightedScores(evaluations);

  if (isAIProviderConfigured()) {
    try {
      const aiResult = await createStructuredResponse({
        name: "interview_report",
        schema: reportSchema,
        instructions: buildReportPrompt({
          role: interview.role,
          interviewType: interview.interviewType,
        }),
        input: {
          role: interview.role,
          interviewType: interview.interviewType,
          feedback: interview.feedback,
          evaluations,
          scores,
        },
      });

      if (aiResult) {
        return {
          ...aiResult,
          scores,
        };
      }
    } catch (error) {
      logger.warn(`Report generation fallback engaged: ${error.message}`);
    }
  }

  return {
    ...buildFallbackReport({ interview, scores }),
    scores,
  };
};

module.exports = {
  generateInterviewReport,
};
