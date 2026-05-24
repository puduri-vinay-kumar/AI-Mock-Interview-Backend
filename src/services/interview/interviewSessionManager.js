const { v4: uuidv4 } = require("uuid");
const Resume = require("../../models/Resume");
const { generateQuestionSet } = require("../ai/questionGenerator");
const { evaluateAnswer } = require("../ai/answerEvaluator");
const { generateFeedback } = require("../ai/feedbackGenerator");
const { calculateWeightedScores } = require("../ai/scoringEngine");
const { decideNextStep } = require("../ai/adaptiveEngine");
const { generateInterviewReport } = require("../ai/reportGenerator");
const {
  createInitialSessionState,
  appendTranscriptEntries,
  updateSessionStateAfterAnswer,
} = require("./sessionStateManager");
const { deriveResumeSkills, buildNextQuestion } = require("./questionFlowManager");

const getResumeProfile = async (interview) => {
  return Resume.findOne({ userId: interview.userId }).sort({ uploadedAt: -1 });
};

const bootstrapInterviewSession = async ({
  userId,
  role,
  experienceLevel,
  interviewType,
  duration,
  resumeProfile,
  previousScore,
}) => {
  const skills = deriveResumeSkills(resumeProfile);
  const questions = await generateQuestionSet(
    {
      role,
      experienceLevel,
      interviewType,
      skills,
      previousScore,
    },
    3
  );

  const sessionState = createInitialSessionState({
    questions,
    resumeSkills: skills,
  });

  return {
    interviewPayload: {
      sessionId: uuidv4(),
      userId,
      role,
      experienceLevel,
      interviewType,
      duration,
      status: "scheduled",
      currentDifficulty: questions[0]?.difficulty || "medium",
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
      firstQuestion: questions[0] || null,
      resumeSkills: skills,
      targetQuestionCount: sessionState.targetQuestionCount,
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
  const maxQuestions = Number(process.env.INTERVIEW_MAX_QUESTIONS) || 6;
  if (interview.questions.length >= maxQuestions || currentAnswers.length >= maxQuestions) {
    return { questions: interview.questions, nextQuestion: null, adaptiveHistory };
  }

  const resumeProfile = await getResumeProfile(interview);
  const nextStep = decideNextStep({
    currentDifficulty: interview.currentDifficulty,
    evaluation: lastEvaluation,
    adaptiveHistory,
    resumeSkills: deriveResumeSkills(resumeProfile),
    interviewType: interview.interviewType,
  });

  const nextQuestion = await buildNextQuestion({
    interview,
    newDifficulty: nextStep.newDifficulty,
    nextTopic: nextStep.newTopic,
    previousScore: lastEvaluation.score,
    resumeProfile,
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
  }

  const maxQuestions = Number(process.env.INTERVIEW_MAX_QUESTIONS) || 6;
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
  const report = await generateInterviewReport({ interview });

  return {
    interviewId: interview._id,
    technicalKnowledge: interview.scores.technicalKnowledge,
    communication: interview.scores.communication,
    confidence: interview.scores.confidence,
    problemSolving: interview.scores.problemSolving,
    conceptualClarity: interview.scores.conceptualClarity,
    strengths: interview.feedback.strengths,
    weaknesses: interview.feedback.weaknesses,
    suggestedLearnings: interview.feedback.suggestedLearnings,
    overallScore: interview.scores.overallScore,
    detailedAnalysis: report.detailedAnalysis,
    topicScores: report.topicScores,
    radarMetrics: {
      technicalKnowledge: interview.scores.technicalKnowledge,
      communication: interview.scores.communication,
      confidence: interview.scores.confidence,
      problemSolving: interview.scores.problemSolving,
      conceptualClarity: interview.scores.conceptualClarity,
    },
    learningRecommendations: report.learningRecommendations,
  };
};

module.exports = {
  bootstrapInterviewSession,
  syncInterviewProgress,
  processRealtimeAnswer,
  finalizeInterviewSession,
};
