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

const chooseNextTopic = ({ latestTopic, resumeSkills = [], interviewType, repeatedMistake }) => {
  if (repeatedMistake) {
    const alternativeSkill = resumeSkills.find((skill) => skill !== latestTopic);
    return alternativeSkill || (interviewType === "hr" ? "communication" : "problem solving");
  }

  return latestTopic || resumeSkills[0] || "core fundamentals";
};

const decideNextStep = ({
  currentDifficulty = "medium",
  evaluation,
  adaptiveHistory = [],
  resumeSkills = [],
  interviewType,
}) => {
  const newDifficulty = adjustDifficulty(currentDifficulty, evaluation.score);
  const repeatedMistake = detectRepeatedMistakeTopic(adaptiveHistory, evaluation.topic);
  const newTopic = chooseNextTopic({
    latestTopic: evaluation.topic,
    resumeSkills,
    interviewType,
    repeatedMistake,
  });

  return {
    newDifficulty,
    newTopic,
    repeatedMistake,
    reason: repeatedMistake
      ? "Repeated weakness detected. Switching topic to rebuild confidence."
      : newDifficulty !== currentDifficulty
        ? "Difficulty adjusted based on latest answer performance."
        : "Maintain current progression and continue exploring the topic.",
  };
};

module.exports = {
  decideNextStep,
};
