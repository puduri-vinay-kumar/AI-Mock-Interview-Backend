const { v4: uuidv4 } = require("uuid");
const {
  createStructuredResponse,
  isAIProviderConfigured,
} = require("./provider.service");
const { getQuestionPrompt } = require("./promptTemplates");
const { resolveRoleBlueprint } = require("./roleBlueprints");
const { resolveLevelRule } = require("./levelRules");
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

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildInterviewState = (context, domainProfile, levelRule) => {
  const priorQuestions = context.priorQuestions || [];
  const priorTopics = context.priorTopics || [];

  return {
    roleKey: domainProfile.domainKey,
    roleLabel: domainProfile.label,
    levelKey: levelRule.key,
    levelLabel: levelRule.label,
    stage: context.isOpeningQuestion
      ? "opening"
      : context.isFollowUp
        ? "follow-up"
        : context.questionIndex <= 2
          ? "core-screen"
          : "deep-dive",
    allowedTopics: domainProfile.allowedTopics,
    starterTopics: domainProfile.starterTopics,
    priorQuestions,
    priorTopics,
    lastTopic:
      priorTopics[priorTopics.length - 1] ||
      context.topic ||
      domainProfile.starterTopics[0] ||
      "general",
    followUpContext: context.followUpContext || null,
  };
};

const clampDifficultyToLevel = (difficulty, levelRule) => {
  if (levelRule.preferredDifficulties.includes(difficulty)) {
    return difficulty;
  }
  return levelRule.defaultDifficulty;
};

const getDomainProfile = (context) => {
  const blueprint = resolveRoleBlueprint(context);
  return {
    domainKey: blueprint.key,
    label: blueprint.label,
    allowedTopics: blueprint.coreTopics,
    starterTopics: blueprint.starterTopics,
    allowedQuestionTypes: blueprint.allowedQuestionTypes,
    forbiddenKeywords: blueprint.forbiddenKeywords,
    blueprint,
  };
};

const buildOpeningQuestion = ({ skills = [], interviewType, domainProfile }) => {
  const starterTopic = domainProfile?.starterTopics?.[1] || skills[0] || "your recent work";

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
      `Could you start by introducing yourself and telling me about your background and any recent hands-on work related to ${starterTopic}?`,
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

  const starterTopic = profile.starterTopics?.find(
    (item) =>
      item &&
      !normalizedPriorTopics.includes(normalizeText(item)) &&
      !violatesDomainConstraints(item, profile)
  );
  if (starterTopic) {
    return starterTopic;
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
  levelRule,
  isFollowUp = false,
  followUpContext,
}) => {
  const profile = domainProfile || getDomainProfile({ role, interviewType, skills });
  const resolvedLevelRule = levelRule || resolveLevelRule();
  const inferredTopic = chooseFallbackTopic({
    topic,
    skills,
    priorTopics,
    profile,
    interviewType,
  });
  const difficulty = clampDifficultyToLevel(
    previousScore >= 80 ? "hard" : previousScore >= 60 ? "medium" : "easy",
    resolvedLevelRule
  );

  if (isOpeningQuestion) {
    return buildOpeningQuestion({ skills, interviewType, domainProfile: profile });
  }

  if (isFollowUp) {
    return {
      question: `Can you go one level deeper on ${followUpContext?.topic || inferredTopic}, especially around implementation choices, tradeoffs, or edge cases?`,
      difficulty: clampDifficultyToLevel("medium", resolvedLevelRule),
      topic: followUpContext?.topic || inferredTopic,
      followUpPossible: false,
      type: followUpContext?.type || (interviewType === "coding" ? "coding" : "technical"),
      expectedAnswer:
        "A deeper explanation covering tradeoffs, implementation details, edge cases, or debugging decisions.",
    };
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

const doesQuestionTypeFitBlueprint = (questionType, profile) => {
  return profile.allowedQuestionTypes.includes(questionType);
};

const validateQuestionResponse = (question, context, profile, levelRule) => {
  if (!question?.question || question.question.length < 12) {
    return { valid: false, reason: "Question text is too short or empty." };
  }

  if (isQuestionDuplicate(question.question, context.priorQuestions || [])) {
    return { valid: false, reason: "Question duplicates a prior question." };
  }

  if (
    !context.isOpeningQuestion &&
    context.interviewType !== "hr" &&
    context.interviewType !== "behavioral" &&
    violatesDomainConstraints(question.question, profile)
  ) {
    return { valid: false, reason: "Question violates role domain constraints." };
  }

  if (!doesQuestionTypeFitBlueprint(question.type || "technical", profile)) {
    return { valid: false, reason: "Question type does not fit the role blueprint." };
  }

  if (!levelRule.preferredDifficulties.includes(question.difficulty)) {
    question.difficulty = clampDifficultyToLevel(question.difficulty, levelRule);
  }

  return { valid: true, reason: "" };
};

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
  const levelRule = resolveLevelRule(context.experienceLevel);
  const interviewState = buildInterviewState(context, domainProfile, levelRule);
  const promptContext = {
    ...context,
    domainLabel: domainProfile.label,
    domainTopics: domainProfile.allowedTopics,
    starterTopics: domainProfile.starterTopics,
    allowedQuestionTypes: domainProfile.allowedQuestionTypes,
    forbiddenTopics: domainProfile.forbiddenKeywords,
    priorQuestions: context.priorQuestions || [],
    levelRule: {
      key: levelRule.key,
      label: levelRule.label,
      preferredDifficulties: levelRule.preferredDifficulties,
      answerExpectation: levelRule.answerExpectation,
      topicDepth: levelRule.topicDepth,
    },
    interviewState,
  };

  if (context.isOpeningQuestion) {
    return normalizeQuestion(
      buildOpeningQuestion({ ...context, domainProfile }),
      "curated"
    );
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
        const validation = validateQuestionResponse(
          normalizedQuestion,
          context,
          domainProfile,
          levelRule
        );

        if (validation.valid) {
          return normalizedQuestion;
        }

        logger.warn(
          `AI question rejected. Reason: ${validation.reason}. Falling back to curated question.`
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
      levelRule,
    }),
    "fallback"
  );
};

const generateQuestionSet = async (context, count = 3) => {
  const domainProfile = getDomainProfile(context);
  const levelRule = resolveLevelRule(context.experienceLevel);
  const interviewState = buildInterviewState(context, domainProfile, levelRule);
  const promptContext = {
    ...context,
    domainLabel: domainProfile.label,
    domainTopics: domainProfile.allowedTopics,
    starterTopics: domainProfile.starterTopics,
    allowedQuestionTypes: domainProfile.allowedQuestionTypes,
    forbiddenTopics: domainProfile.forbiddenKeywords,
    priorQuestions: context.priorQuestions || [],
    levelRule: {
      key: levelRule.key,
      label: levelRule.label,
      preferredDifficulties: levelRule.preferredDifficulties,
      answerExpectation: levelRule.answerExpectation,
      topicDepth: levelRule.topicDepth,
    },
    interviewState,
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
            const validation = validateQuestionResponse(
              question,
              context,
              domainProfile,
              levelRule
            );
            if (!validation.valid) {
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
        levelRule,
      }),
      "fallback"
    )
  );
};

module.exports = {
  generateInterviewQuestion,
  generateQuestionSet,
};
