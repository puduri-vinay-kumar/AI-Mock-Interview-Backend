const createInitialSessionState = ({ questions = [], resumeSkills = [], mode = "rest" }) => ({
  currentQuestionIndex: 0,
  targetQuestionCount: Number(process.env.INTERVIEW_MAX_QUESTIONS) || 6,
  askedQuestionIds: questions.slice(0, 1).map((question) => question.questionId),
  currentTopic: questions[0]?.topic || resumeSkills[0] || "general",
  completedTopics: [],
  repeatedMistakeTopics: [],
  lastScoreDelta: 0,
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
}) => {
  const completedTopics = sessionState.completedTopics.includes(currentQuestion.topic)
    ? sessionState.completedTopics
    : [...sessionState.completedTopics, currentQuestion.topic].filter(Boolean);

  return {
    ...sessionState,
    completedTopics,
    currentTopic: nextTopic || currentQuestion.topic,
    lastScoreDelta: Number((evaluation.score - 60).toFixed(2)),
  };
};

module.exports = {
  createInitialSessionState,
  appendTranscriptEntries,
  updateSessionStateAfterAnswer,
};
