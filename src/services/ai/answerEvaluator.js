const {
  createStructuredResponse,
  isAIProviderConfigured,
} = require("./provider.service");
const { buildEvaluationPrompt } = require("./promptTemplates");

const evaluationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "number" },
    technicalAccuracy: { type: "number" },
    clarity: { type: "number" },
    communication: { type: "number" },
    confidence: { type: "number" },
    depthOfExplanation: { type: "number" },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
    confidenceLevel: { type: "string", enum: ["low", "medium", "high"] },
    topic: { type: "string" },
  },
  required: [
    "score",
    "technicalAccuracy",
    "clarity",
    "communication",
    "confidence",
    "depthOfExplanation",
    "strengths",
    "weaknesses",
    "suggestions",
    "confidenceLevel",
    "topic",
  ],
};

const clampScore = (value) => Math.max(0, Math.min(100, Number(value) || 0));

const fallbackEvaluateAnswer = ({ question, answer, difficulty, topic }) => {
  const answerText = String(answer || "").trim();
  const wordCount = answerText ? answerText.split(/\s+/).length : 0;
  const baseScore = Math.min(92, 40 + wordCount * 1.1);
  const complexityBoost = difficulty === "hard" ? 5 : difficulty === "medium" ? 2 : 0;
  const score = clampScore(baseScore + complexityBoost);

  return {
    score,
    technicalAccuracy: clampScore(score + 2),
    clarity: clampScore(score - 3),
    communication: clampScore(score - 1),
    confidence: clampScore(score - 4),
    depthOfExplanation: clampScore(score + (wordCount > 90 ? 4 : -2)),
    strengths:
      wordCount > 70
        ? ["Provided a reasonably detailed explanation", "Maintained answer structure"]
        : ["Attempted the core concept", "Showed baseline understanding"],
    weaknesses:
      wordCount > 70
        ? ["Could add stronger quantified examples"]
        : ["Answer needs more depth", "Examples and tradeoffs were limited"],
    suggestions: [
      "Use a clearer problem-solution-impact structure",
      "Add one concrete project-based example",
      "Explain tradeoffs and edge cases explicitly",
    ],
    confidenceLevel: score >= 80 ? "high" : score >= 60 ? "medium" : "low",
    topic: topic || question.topic || "general",
  };
};

const evaluateAnswer = async ({
  role,
  interviewType,
  question,
  answer,
}) => {
  const prompt = buildEvaluationPrompt({
    role,
    interviewType,
    question: question.question,
    difficulty: question.difficulty,
    expectedAnswer: question.expectedAnswer,
  });

  if (isAIProviderConfigured()) {
    const aiResult = await createStructuredResponse({
      name: "answer_evaluation",
      schema: evaluationSchema,
      instructions: prompt,
      input: {
        question,
        answer,
      },
    });

    if (aiResult) {
      return {
        ...aiResult,
        score: clampScore(aiResult.score),
        technicalAccuracy: clampScore(aiResult.technicalAccuracy),
        clarity: clampScore(aiResult.clarity),
        communication: clampScore(aiResult.communication),
        confidence: clampScore(aiResult.confidence),
        depthOfExplanation: clampScore(aiResult.depthOfExplanation),
      };
    }
  }

  return fallbackEvaluateAnswer({
    question,
    answer,
    difficulty: question.difficulty,
    topic: question.topic,
  });
};

module.exports = {
  evaluateAnswer,
};
