const difficultyOrder = ["easy", "medium", "hard"];

const adjustDifficulty = (currentDifficulty, score) => {
  const currentIndex = difficultyOrder.indexOf(currentDifficulty);

  if (score >= 80 && currentIndex < difficultyOrder.length - 1) {
    return difficultyOrder[currentIndex + 1];
  }

  if (score < 55 && currentIndex > 0) {
    return difficultyOrder[currentIndex - 1];
  }

  return currentDifficulty;
};

const detectRepeatedMistakeTopic = (adaptiveHistory = [], latestTopic) => {
  const recentWeakTopics = adaptiveHistory
    .filter((item) => item.score < 55)
    .map((item) => item.newTopic);

  const repetitions = recentWeakTopics.filter((topic) => topic === latestTopic).length;
  return repetitions >= 2;
};

const chooseNextTopic = ({
  latestTopic,
  resumeSkills = [],
  interviewType,
  repeatedMistake,
  blueprintTopics = [],
  completedTopics = [],
}) => {
  if (repeatedMistake) {
    const alternativeSkill = resumeSkills.find((skill) => skill !== latestTopic);
    const alternativeBlueprintTopic = blueprintTopics.find(
      (topic) => topic !== latestTopic && !completedTopics.includes(topic)
    );
    return (
      alternativeSkill ||
      alternativeBlueprintTopic ||
      (interviewType === "hr" ? "communication" : "problem solving")
    );
  }

  const nextBlueprintTopic = blueprintTopics.find(
    (topic) => topic !== latestTopic && !completedTopics.includes(topic)
  );

  return latestTopic || resumeSkills[0] || nextBlueprintTopic || "core fundamentals";
};

const decideNextStep = ({
  currentDifficulty = "medium",
  evaluation,
  adaptiveHistory = [],
  resumeSkills = [],
  interviewType,
  currentQuestion,
  sessionState = {},
  blueprintTopics = [],
  followUpThreshold = 75,
}) => {
  const newDifficulty = adjustDifficulty(currentDifficulty, evaluation.score);
  const repeatedMistake = detectRepeatedMistakeTopic(adaptiveHistory, evaluation.topic);
  const shouldFollowUp =
    Boolean(currentQuestion?.followUpPossible) &&
    !repeatedMistake &&
    evaluation.score >= followUpThreshold &&
    (sessionState.followUpCount || 0) < 1;
  const newTopic = chooseNextTopic({
    latestTopic: evaluation.topic,
    resumeSkills,
    interviewType,
    repeatedMistake,
    blueprintTopics,
    completedTopics: sessionState.completedTopics || [],
  });

  return {
    newDifficulty,
    newTopic: shouldFollowUp ? evaluation.topic || newTopic : newTopic,
    repeatedMistake,
    shouldFollowUp,
    followUpContext: shouldFollowUp
      ? {
          topic: evaluation.topic || currentQuestion?.topic || newTopic,
          type: currentQuestion?.type || "technical",
          anchorQuestionId: currentQuestion?.questionId || "",
        }
      : null,
    reason: repeatedMistake
      ? "Repeated weakness detected. Switching topic to rebuild confidence."
      : shouldFollowUp
        ? "Strong answer detected. Ask a deeper follow-up on the same topic."
        : newDifficulty !== currentDifficulty
          ? "Difficulty adjusted based on latest answer performance."
          : "Maintain current progression and continue exploring the topic.",
  };
};

module.exports = {
  decideNextStep,
};
