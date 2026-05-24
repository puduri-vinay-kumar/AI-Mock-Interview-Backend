const { v4: uuidv4 } = require("uuid");
const {
  createStructuredResponse,
  isAIProviderConfigured,
} = require("./provider.service");
const { getQuestionPrompt } = require("./promptTemplates");

const singleQuestionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    question: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    topic: { type: "string" },
    followUpPossible: { type: "boolean" },
    type: {
      type: "string",
      enum: ["technical", "behavioral", "coding", "system-design", "vlsi", "hr"],
    },
    expectedAnswer: { type: "string" },
  },
  required: [
    "question",
    "difficulty",
    "topic",
    "followUpPossible",
    "type",
    "expectedAnswer",
  ],
};

const questionListSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      minItems: 1,
      items: singleQuestionSchema,
    },
  },
  required: ["questions"],
};

const difficultyPool = ["easy", "medium", "hard"];

const buildFallbackQuestion = ({
  role,
  experienceLevel,
  interviewType,
  skills = [],
  previousScore = 0,
  topic,
}) => {
  const inferredTopic =
    topic || skills[0] || (interviewType === "coding" ? "problem solving" : "core fundamentals");
  const difficulty =
    previousScore >= 80 ? "hard" : previousScore >= 60 ? "medium" : "easy";

  return {
    question: `Explain how you would handle ${inferredTopic} in a ${role} interview scenario as a ${experienceLevel} candidate.`,
    difficulty,
    topic: inferredTopic,
    followUpPossible: true,
    type:
      interviewType === "hr"
        ? "hr"
        : interviewType === "coding"
          ? "coding"
          : /vlsi|verilog|rtl/i.test(`${role} ${skills.join(" ")}`)
            ? "vlsi"
            : "technical",
    expectedAnswer:
      "A structured explanation covering fundamentals, tradeoffs, and a practical example.",
  };
};

const normalizeQuestion = (question, source) => ({
  questionId: uuidv4(),
  question: question.question,
  difficulty: difficultyPool.includes(question.difficulty) ? question.difficulty : "medium",
  topic: question.topic || "general",
  followUpPossible: Boolean(question.followUpPossible),
  type: question.type || "technical",
  expectedAnswer: question.expectedAnswer || "",
  source,
});

const generateInterviewQuestion = async (context) => {
  const prompt = getQuestionPrompt(context);

  if (isAIProviderConfigured()) {
    const aiResult = await createStructuredResponse({
      name: "interview_question",
      schema: singleQuestionSchema,
      instructions: prompt,
      input: context,
    });

    if (aiResult) {
      return normalizeQuestion(aiResult, "ai");
    }
  }

  return normalizeQuestion(buildFallbackQuestion(context), "fallback");
};

const generateQuestionSet = async (context, count = 3) => {
  const prompt = `${getQuestionPrompt(context)} Generate ${count} varied questions that progress logically.`;

  if (isAIProviderConfigured()) {
    const aiResult = await createStructuredResponse({
      name: "interview_question_set",
      schema: questionListSchema,
      instructions: prompt,
      input: context,
    });

    if (aiResult?.questions?.length) {
      return aiResult.questions.map((question) => normalizeQuestion(question, "ai"));
    }
  }

  return Array.from({ length: count }, (_, index) =>
    normalizeQuestion(
      buildFallbackQuestion({
        ...context,
        previousScore: Math.max(0, (context.previousScore || 0) + index * 5),
        topic: context.skills?.[index] || context.role,
      }),
      "fallback"
    )
  );
};

module.exports = {
  generateInterviewQuestion,
  generateQuestionSet,
};
