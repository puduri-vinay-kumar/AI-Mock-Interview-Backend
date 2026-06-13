const { v4: uuidv4 } = require("uuid");
const Resume = require("../../models/Resume");
const { generateInterviewQuestion } = require("../ai/questionGenerator");
const { resolveRoleBlueprint } = require("../ai/roleBlueprints");
const { resolveLevelRule } = require("../ai/levelRules");
const { evaluateAnswer } = require("../ai/answerEvaluator");
const { generateFeedback } = require("../ai/feedbackGenerator");
const { calculateWeightedScores } = require("../ai/scoringEngine");
const { decideNextStep } = require("../ai/adaptiveEngine");
const { generateInterviewReport } = require("../ai/reportGenerator");
const { generateSpeech } = require("../ai/voice/textToSpeech");
const {
  createInitialSessionState,
  appendTranscriptEntries,
  updateSessionStateAfterAnswer,
} = require("./sessionStateManager");
const { deriveResumeSkills, buildNextQuestion } = require("./questionFlowManager");

const getResumeProfile = async (interview) => {
  return Resume.findOne({ userId: interview.userId }).sort({ uploadedAt: -1 });
};

const hasEvaluation = (answer) =>
  answer?.evaluation && typeof answer.evaluation.score === "number";

const getTargetQuestionCount = (interviewLike = {}) =>
  Number(
    interviewLike?.sessionState?.targetQuestionCount || interviewLike?.questionCount
  ) ||
  Number(process.env.INTERVIEW_MAX_QUESTIONS) ||
  6;

const estimateDurationFromQuestionCount = (questionCount) => {
  const normalizedQuestionCount = Math.max(1, Number(questionCount) || 5);
  return Math.min(180, Math.max(5, normalizedQuestionCount * 3));
};

const buildVoiceTurnPayload = async (question, options = {}) => {
  if (!question) {
    return null;
  }

  let speechPayload = {
    audioUrl: null,
    relativeAudioUrl: null,
    voiceAvailable: false,
    speechText: question.question,
    fallbackMode: "browser-tts",
    provider: "fallback",
  };

  try {
    speechPayload = await generateSpeech(question.question, {
      voice: options.voice,
      instructions:
        options.instructions ||
        "Ask the interview question clearly, professionally, and conversationally.",
    });
  } catch (error) {
    speechPayload = {
      audioUrl: null,
      relativeAudioUrl: null,
      voiceAvailable: false,
      speechText: question.question,
      fallbackMode: "browser-tts",
      provider: "fallback",
    };
  }

  return {
    sessionId: options.sessionId || null,
    questionId: question.questionId,
    question: question.question,
    topic: question.topic,
    difficulty: question.difficulty,
    type: question.type,
    followUpPossible: question.followUpPossible,
    audioUrl: speechPayload.audioUrl,
    relativeAudioUrl: speechPayload.relativeAudioUrl,
    voiceAvailable: speechPayload.voiceAvailable,
    speechText: speechPayload.speechText,
    fallbackMode: speechPayload.fallbackMode,
    provider: speechPayload.provider,
    shouldAutoPlay: Boolean(options.autoPlay),
    voiceMode: true,
  };
};

const bootstrapInterviewSession = async ({
  userId,
  role,
  experienceLevel,
  interviewType,
  duration,
  questionCount,
  resumeProfile,
  previousScore,
}) => {
  const skills = deriveResumeSkills(resumeProfile);
  const roleBlueprint = resolveRoleBlueprint({ role, interviewType, skills });
  const levelRule = resolveLevelRule(experienceLevel);
  const openingQuestion = await generateInterviewQuestion({
    role,
    experienceLevel,
    interviewType,
    skills,
    previousScore,
    questionIndex: 0,
    isOpeningQuestion: true,
    askIntroFirst: true,
    topic: "introduction",
    priorQuestions: [],
    priorTopics: [],
  });
  const questions = [openingQuestion];

  const sessionState = createInitialSessionState({
    questions,
    resumeSkills: skills,
    mode: "voice",
    questionCount,
  });

  const normalizedQuestionCount = getTargetQuestionCount({ questionCount, sessionState });
  const estimatedDuration =
    duration || estimateDurationFromQuestionCount(normalizedQuestionCount);
  const firstQuestion = questions[0] || null;
  const sessionId = uuidv4();

  return {
    interviewPayload: {
      sessionId,
      userId,
      role,
      experienceLevel,
      interviewType,
      duration: duration || estimatedDuration,
      questionCount: normalizedQuestionCount,
      status: "scheduled",
      currentDifficulty: firstQuestion?.difficulty || "medium",
      questions,
      answers: [],
      scores: {
        technicalKnowledge: 0,
        communication: 0,
        confidence: 0,
        problemSolving: 0,
        conceptualClarity: 0,
        overallScore: 0,
      },
      feedback: {
        summary: "Interview session created and ready to start.",
        strengths: [],
        weaknesses: [],
        suggestedLearnings: [],
      },
      sessionState,
      liveTranscript: [],
      adaptiveHistory: [],
    },
    sessionMeta: {
      firstQuestion,
      currentTurn: await buildVoiceTurnPayload(firstQuestion, {
        sessionId,
        autoPlay: false,
      }),
      resumeSkills: skills,
      targetQuestionCount: normalizedQuestionCount,
      interviewMode: "voice",
    },
  };
};

const dedupeAnswersByQuestionId = (answers = []) => {
  const uniqueMap = new Map();
  answers.forEach((answer) => {
    const key = answer.questionId || answer.question;
    if (key) {
      uniqueMap.set(key, answer);
    }
  });
  return Array.from(uniqueMap.values());
};

const evaluateAllAnswers = async (interview, answers) => {
  const questionLookup = new Map(
    interview.questions.map((question) => [question.questionId, question])
  );

  return Promise.all(
    answers.map(async (answer) => {
      if (hasEvaluation(answer)) {
        return answer;
      }

      const matchedQuestion =
        questionLookup.get(answer.questionId) ||
        interview.questions.find((question) => question.question === answer.question);

      const evaluation = await evaluateAnswer({
        role: interview.role,
        interviewType: interview.interviewType,
        question: matchedQuestion || {
          question: answer.question,
          difficulty: interview.currentDifficulty,
          topic: interview.sessionState?.currentTopic || "general",
          expectedAnswer: "",
        },
        answer: answer.answer,
      });

      return {
        questionId: answer.questionId || matchedQuestion?.questionId || uuidv4(),
        question: answer.question || matchedQuestion?.question || "Question unavailable",
        answer: answer.answer,
        transcript: answer.transcript || answer.answer,
        durationSeconds: answer.durationSeconds || 0,
        evaluation,
        answeredAt: answer.answeredAt || new Date(),
      };
    })
  );
};

const maybeExpandQuestionSet = async ({
  interview,
  currentAnswers,
  lastEvaluation,
  adaptiveHistory,
}) => {
  const maxQuestions = getTargetQuestionCount(interview);
  if (interview.questions.length >= maxQuestions || currentAnswers.length >= maxQuestions) {
    return { questions: interview.questions, nextQuestion: null, adaptiveHistory };
  }

  const resumeProfile = await getResumeProfile(interview);
  const resumeSkills = deriveResumeSkills(resumeProfile);
  const roleBlueprint = resolveRoleBlueprint({
    role: interview.role,
    interviewType: interview.interviewType,
    skills: resumeSkills,
  });
  const levelRule = resolveLevelRule(interview.experienceLevel);
  const nextStep = decideNextStep({
    currentDifficulty: interview.currentDifficulty,
    evaluation: lastEvaluation,
    adaptiveHistory,
    resumeSkills,
    interviewType: interview.interviewType,
    currentQuestion: interview.questions[currentAnswers.length - 1] || interview.questions[0],
    sessionState: interview.sessionState?.toObject?.() || interview.sessionState || {},
    blueprintTopics: roleBlueprint.starterTopics.concat(roleBlueprint.coreTopics),
    followUpThreshold: levelRule.followUpThreshold,
  });

  const nextQuestion = await buildNextQuestion({
    interview,
    newDifficulty: nextStep.newDifficulty,
    nextTopic: nextStep.newTopic,
    previousScore: lastEvaluation.score,
    resumeProfile,
    questionIndex: currentAnswers.length,
    isFollowUp: nextStep.shouldFollowUp,
    followUpContext: nextStep.followUpContext,
  });

  return {
    questions: [...interview.questions, nextQuestion],
    nextQuestion,
    adaptiveHistory: [
      ...adaptiveHistory,
      {
        questionId: nextQuestion.questionId,
        previousDifficulty: interview.currentDifficulty,
        newDifficulty: nextStep.newDifficulty,
        previousTopic: lastEvaluation.topic,
        newTopic: nextStep.newTopic,
        reason: nextStep.reason,
        score: lastEvaluation.score,
      },
    ],
    nextDifficulty: nextStep.newDifficulty,
    nextTopic: nextStep.newTopic,
    shouldFollowUp: nextStep.shouldFollowUp,
  };
};

const syncInterviewProgress = async ({
  interview,
  answers,
  liveTranscript,
  requestedStatus,
}) => {
  const mergedAnswers = dedupeAnswersByQuestionId([
    ...(interview.answers || []),
    ...(answers || []),
  ]);
  const evaluatedAnswers = await evaluateAllAnswers(interview, mergedAnswers);
  const evaluations = evaluatedAnswers.map((answer) => answer.evaluation);
  const scores = calculateWeightedScores(evaluations);
  const feedback = await generateFeedback({
    role: interview.role,
    interviewType: interview.interviewType,
    evaluations,
  });

  const transcript = appendTranscriptEntries(interview.liveTranscript, liveTranscript);
  const lastAnswer = evaluatedAnswers[evaluatedAnswers.length - 1];
  let adaptiveHistory = [...(interview.adaptiveHistory || [])];
  let questions = [...interview.questions];
  let currentDifficulty = interview.currentDifficulty;
  let nextQuestion = null;
  let nextTopic = interview.sessionState?.currentTopic;
  let followUpIssued = false;

  if (lastAnswer && requestedStatus !== "completed") {
    const expansion = await maybeExpandQuestionSet({
      interview,
      currentAnswers: evaluatedAnswers,
      lastEvaluation: lastAnswer.evaluation,
      adaptiveHistory,
    });
    adaptiveHistory = expansion.adaptiveHistory;
    questions = expansion.questions;
    nextQuestion = expansion.nextQuestion;
    currentDifficulty = expansion.nextDifficulty || currentDifficulty;
    nextTopic = expansion.nextTopic || nextTopic;
    followUpIssued = Boolean(expansion.shouldFollowUp);
  }

  const maxQuestions = getTargetQuestionCount(interview);
  const status =
    requestedStatus ||
    (evaluatedAnswers.length >= maxQuestions ? "completed" : "in-progress");

  const sessionState = updateSessionStateAfterAnswer({
    sessionState: {
      ...(interview.sessionState?.toObject?.() || interview.sessionState || {}),
      currentQuestionIndex: Math.min(evaluatedAnswers.length, questions.length - 1),
      askedQuestionIds: questions.slice(0, Math.max(1, evaluatedAnswers.length + 1)).map((q) => q.questionId),
    },
    currentQuestion: lastAnswer
      ? questions.find((question) => question.questionId === lastAnswer.questionId) || questions[0]
      : questions[0],
    evaluation: lastAnswer?.evaluation || { score: 0 },
    nextTopic,
    followUpIssued,
  });

  return {
    status,
    answers: evaluatedAnswers,
    scores,
    feedback,
    questions,
    currentDifficulty,
    sessionState,
    liveTranscript: transcript,
    adaptiveHistory,
    nextQuestion,
  };
};

const processRealtimeAnswer = async ({
  interview,
  answerPayload,
  transcriptEntry,
}) => {
  return syncInterviewProgress({
    interview,
    answers: [answerPayload],
    liveTranscript: transcriptEntry ? [transcriptEntry] : [],
  });
};

const finalizeInterviewSession = async (interview) => {
  const answersWithEvaluations = await evaluateAllAnswers(interview, interview.answers || []);
  const evaluations = answersWithEvaluations.map((answer) => answer.evaluation);
  const scores = calculateWeightedScores(evaluations);
  const feedback = await generateFeedback({
    role: interview.role,
    interviewType: interview.interviewType,
    evaluations,
  });

  interview.answers = answersWithEvaluations;
  interview.scores = scores;
  interview.feedback = feedback;

  const report = await generateInterviewReport({ interview });

  return {
    interviewId: interview._id,
    technicalKnowledge: scores.technicalKnowledge,
    communication: scores.communication,
    confidence: scores.confidence,
    problemSolving: scores.problemSolving,
    conceptualClarity: scores.conceptualClarity,
    strengths: feedback.strengths,
    weaknesses: feedback.weaknesses,
    suggestedLearnings: feedback.suggestedLearnings,
    overallScore: scores.overallScore,
    detailedAnalysis: report.detailedAnalysis,
    topicScores: report.topicScores,
    radarMetrics: {
      technicalKnowledge: scores.technicalKnowledge,
      communication: scores.communication,
      confidence: scores.confidence,
      problemSolving: scores.problemSolving,
      conceptualClarity: scores.conceptualClarity,
    },
    learningRecommendations: report.learningRecommendations,
  };
};

module.exports = {
  bootstrapInterviewSession,
  syncInterviewProgress,
  processRealtimeAnswer,
  finalizeInterviewSession,
  buildVoiceTurnPayload,
};
