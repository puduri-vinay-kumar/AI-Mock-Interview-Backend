const { v4: uuidv4 } = require("uuid");
const {
  createStructuredResponse,
  isAIProviderConfigured,
} = require("./provider.service");
const { getQuestionPrompt } = require("./promptTemplates");
const logger = require("../../utils/logger");

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

const DOMAIN_PROFILES = {
  frontend: {
    label: "Frontend Engineering",
    allowedTopics: [
      "javascript",
      "typescript",
      "react",
      "next.js",
      "state management",
      "component design",
      "frontend performance",
      "accessibility",
      "html",
      "css",
      "api integration",
      "testing",
    ],
    forbiddenKeywords: [
      "mongodb schema",
      "database indexing",
      "sql joins",
      "microservices",
      "rest api versioning",
      "express middleware",
      "message queue",
      "redis cache",
      "kubernetes",
    ],
  },
  backend: {
    label: "Backend Engineering",
    allowedTopics: [
      "node.js",
      "express",
      "apis",
      "authentication",
      "databases",
      "mongodb",
      "sql",
      "caching",
      "system design",
      "performance",
      "scalability",
      "testing",
    ],
    forbiddenKeywords: [
      "css animation",
      "flexbox",
      "dom events",
      "react hooks",
      "component props",
      "tailwind",
      "figma",
      "semantic html",
    ],
  },
  fullstack: {
    label: "Full Stack Engineering",
    allowedTopics: [
      "frontend architecture",
      "backend architecture",
      "api design",
      "authentication",
      "react",
      "node.js",
      "databases",
      "deployment",
      "performance",
      "testing",
    ],
    forbiddenKeywords: [],
  },
  vlsi: {
    label: "VLSI Engineering",
    allowedTopics: [
      "digital design",
      "rtl",
      "verilog",
      "systemverilog",
      "timing analysis",
      "verification",
      "physical design",
      "semiconductor fundamentals",
      "synthesis",
      "clock domains",
    ],
    forbiddenKeywords: [
      "react hooks",
      "css",
      "mongodb",
      "express",
      "rest api",
      "node.js",
      "ui components",
    ],
  },
  hr: {
    label: "HR and Behavioral",
    allowedTopics: [
      "introduction",
      "experience",
      "ownership",
      "teamwork",
      "communication",
      "conflict resolution",
      "strengths",
      "career goals",
    ],
    forbiddenKeywords: [],
  },
  general: {
    label: "General Technical",
    allowedTopics: [
      "fundamentals",
      "projects",
      "problem solving",
      "communication",
      "design",
      "debugging",
    ],
    forbiddenKeywords: [],
  },
};

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const inferInterviewDomain = ({ role = "", interviewType = "", skills = [] }) => {
  const roleText = normalizeText(role);
  const skillText = normalizeText(skills.join(" "));
  const interviewTypeText = normalizeText(interviewType);

  if (
    interviewTypeText.includes("hr") ||
    interviewTypeText.includes("behavioral")
  ) {
    return "hr";
  }

  if (
    /vlsi|rtl|asic|verilog|systemverilog|physical design|timing/.test(
      `${roleText} ${skillText}`
    )
  ) {
    return "vlsi";
  }

  if (/full stack|fullstack/.test(roleText)) {
    return "fullstack";
  }

  if (
    /frontend|front end|ui|web/.test(roleText) ||
    /react|next js|nextjs|css|html|frontend/.test(skillText)
  ) {
    return "frontend";
  }

  if (
    /backend|back end|api|server/.test(roleText) ||
    /node js|express|mongodb|sql|redis|backend/.test(skillText)
  ) {
    return "backend";
  }

  return "general";
};

const getDomainProfile = (context) => {
  const domainKey = inferInterviewDomain(context);
  return {
    domainKey,
    ...(DOMAIN_PROFILES[domainKey] || DOMAIN_PROFILES.general),
  };
};

const buildOpeningQuestion = ({ skills = [], interviewType }) => {
  if (interviewType === "hr" || interviewType === "behavioral") {
    return {
      question:
        "Could you briefly introduce yourself and walk me through the experience that best represents your strengths?",
      difficulty: "easy",
      topic: "introduction",
      followUpPossible: true,
      type: "hr",
      expectedAnswer:
        "A concise introduction covering background, relevant experience, strengths, and recent work.",
    };
  }

  if (skills.length > 0) {
    return {
      question: `Could you introduce yourself and tell me about the work or projects where you used ${skills
        .slice(0, 2)
        .join(" and ")}?`,
      difficulty: "easy",
      topic: "introduction",
      followUpPossible: true,
      type: "behavioral",
      expectedAnswer:
        "A clear introduction with relevant skills, project context, and hands-on experience.",
    };
  }

  return {
    question:
      "Could you start by introducing yourself and telling me about your background and recent hands-on work?",
    difficulty: "easy",
    topic: "introduction",
    followUpPossible: true,
    type: "behavioral",
    expectedAnswer:
      "A clear introduction covering background, recent work, and relevant strengths.",
  };
};

const isQuestionDuplicate = (questionText, priorQuestions = []) => {
  const normalizedQuestion = normalizeText(questionText);
  if (!normalizedQuestion) {
    return false;
  }

  return priorQuestions.some(
    (askedQuestion) => normalizeText(askedQuestion) === normalizedQuestion
  );
};

const violatesDomainConstraints = (questionText, profile) => {
  const normalizedQuestion = normalizeText(questionText);
  if (!normalizedQuestion || !profile?.forbiddenKeywords?.length) {
    return false;
  }

  return profile.forbiddenKeywords.some((keyword) =>
    normalizedQuestion.includes(normalizeText(keyword))
  );
};

const chooseFallbackTopic = ({ topic, skills = [], priorTopics = [], profile, interviewType }) => {
  if (topic && !priorTopics.includes(topic)) {
    return topic;
  }

  const normalizedPriorTopics = priorTopics.map((item) => normalizeText(item));
  const skillMatch = skills.find(
    (skill) =>
      skill &&
      !normalizedPriorTopics.includes(normalizeText(skill)) &&
      !violatesDomainConstraints(skill, profile)
  );
  if (skillMatch) {
    return skillMatch;
  }

  const profileTopic = profile.allowedTopics.find(
    (item) =>
      item &&
      !normalizedPriorTopics.includes(normalizeText(item)) &&
      !violatesDomainConstraints(item, profile)
  );
  if (profileTopic) {
    return profileTopic;
  }

  return interviewType === "coding" ? "problem solving" : "core fundamentals";
};

const buildFallbackQuestion = ({
  role,
  interviewType,
  skills = [],
  previousScore = 0,
  topic,
  isOpeningQuestion = false,
  priorTopics = [],
  domainProfile,
}) => {
  const profile = domainProfile || getDomainProfile({ role, interviewType, skills });
  const inferredTopic = chooseFallbackTopic({
    topic,
    skills,
    priorTopics,
    profile,
    interviewType,
  });
  const difficulty =
    previousScore >= 80 ? "hard" : previousScore >= 60 ? "medium" : "easy";

  if (isOpeningQuestion) {
    return buildOpeningQuestion({ skills, interviewType });
  }

  return {
    question:
      interviewType === "coding"
        ? `How would you approach a problem involving ${inferredTopic}?`
        : `Can you explain ${inferredTopic} and how you have applied it in practice?`,
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

const isQuestionValidForContext = (question, context, profile) => {
  if (!question?.question) {
    return false;
  }

  if (isQuestionDuplicate(question.question, context.priorQuestions || [])) {
    return false;
  }

  if (
    !context.isOpeningQuestion &&
    context.interviewType !== "hr" &&
    context.interviewType !== "behavioral" &&
    violatesDomainConstraints(question.question, profile)
  ) {
    return false;
  }

  return true;
};

const generateInterviewQuestion = async (context) => {
  const domainProfile = getDomainProfile(context);
  const promptContext = {
    ...context,
    domainLabel: domainProfile.label,
    domainTopics: domainProfile.allowedTopics,
    forbiddenTopics: domainProfile.forbiddenKeywords,
    priorQuestions: context.priorQuestions || [],
  };

  if (context.isOpeningQuestion) {
    return normalizeQuestion(buildOpeningQuestion(context), "curated");
  }

  const prompt = getQuestionPrompt(promptContext);

  if (isAIProviderConfigured()) {
    try {
      const aiResult = await createStructuredResponse({
        name: "interview_question",
        schema: singleQuestionSchema,
        instructions: prompt,
        input: promptContext,
      });

      if (aiResult) {
        const normalizedQuestion = normalizeQuestion(aiResult, "ai");

        if (isQuestionValidForContext(normalizedQuestion, context, domainProfile)) {
          return normalizedQuestion;
        }

        logger.warn(
          "AI question rejected due to repetition or domain mismatch. Falling back to curated question."
        );
      }
    } catch (error) {
      logger.warn(`Question generation fallback engaged: ${error.message}`);
    }
  }

  return normalizeQuestion(
    buildFallbackQuestion({
      ...context,
      domainProfile,
    }),
    "fallback"
  );
};

const generateQuestionSet = async (context, count = 3) => {
  const domainProfile = getDomainProfile(context);
  const promptContext = {
    ...context,
    domainLabel: domainProfile.label,
    domainTopics: domainProfile.allowedTopics,
    forbiddenTopics: domainProfile.forbiddenKeywords,
    priorQuestions: context.priorQuestions || [],
  };
  const prompt = `${getQuestionPrompt(promptContext)} Generate ${count} varied questions that progress logically.`;

  if (isAIProviderConfigured()) {
    try {
      const aiResult = await createStructuredResponse({
        name: "interview_question_set",
        schema: questionListSchema,
        instructions: prompt,
        input: promptContext,
      });

      if (aiResult?.questions?.length) {
        const normalizedQuestions = aiResult.questions
          .map((question) => normalizeQuestion(question, "ai"))
          .filter((question, index, list) => {
            if (!isQuestionValidForContext(question, context, domainProfile)) {
              return false;
            }

            return (
              list.findIndex(
                (item) => normalizeText(item.question) === normalizeText(question.question)
              ) === index
            );
          });

        if (normalizedQuestions.length >= count) {
          return normalizedQuestions.slice(0, count);
        }
      }
    } catch (error) {
      logger.warn(`Question set fallback engaged: ${error.message}`);
    }
  }

  return Array.from({ length: count }, (_, index) =>
    normalizeQuestion(
      buildFallbackQuestion({
        ...context,
        previousScore: Math.max(0, (context.previousScore || 0) + index * 5),
        topic: context.skills?.[index] || domainProfile.allowedTopics[index] || context.role,
        isOpeningQuestion: index === 0 && Boolean(context.askIntroFirst),
        priorTopics: [...(context.priorTopics || []), ...context.skills.slice(0, index)],
        domainProfile,
      }),
      "fallback"
    )
  );
};

module.exports = {
  generateInterviewQuestion,
  generateQuestionSet,
};
