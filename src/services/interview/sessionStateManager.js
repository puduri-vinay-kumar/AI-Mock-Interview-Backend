const createInitialSessionState = ({
  questions = [],
  resumeSkills = [],
  mode = "rest",
  questionCount,
}) => ({
  currentQuestionIndex: 0,
  targetQuestionCount:
    Number(questionCount) || Number(process.env.INTERVIEW_MAX_QUESTIONS) || 6,
  askedQuestionIds: questions.slice(0, 1).map((question) => question.questionId),
  currentTopic: questions[0]?.topic || resumeSkills[0] || "general",
  completedTopics: [],
  repeatedMistakeTopics: [],
  lastScoreDelta: 0,
  interviewStage: "opening",
  followUpCount: 0,
  mode,
});

const appendTranscriptEntries = (existingEntries = [], newEntries = []) => {
  return [...existingEntries, ...newEntries].slice(-200);
};

const updateSessionStateAfterAnswer = ({
  sessionState,
  currentQuestion,
  evaluation,
  nextTopic,
  followUpIssued = false,
}) => {
  const completedTopics = sessionState.completedTopics.includes(currentQuestion.topic)
    ? sessionState.completedTopics
    : [...sessionState.completedTopics, currentQuestion.topic].filter(Boolean);

  return {
    ...sessionState,
    completedTopics,
    currentTopic: nextTopic || currentQuestion.topic,
    lastScoreDelta: Number((evaluation.score - 60).toFixed(2)),
    followUpCount: followUpIssued ? (sessionState.followUpCount || 0) + 1 : 0,
    interviewStage: followUpIssued
      ? "follow-up"
      : completedTopics.length <= 1
        ? "core-screen"
        : "deep-dive",
  };
};

module.exports = {
  createInitialSessionState,
  appendTranscriptEntries,
  updateSessionStateAfterAnswer,
};
