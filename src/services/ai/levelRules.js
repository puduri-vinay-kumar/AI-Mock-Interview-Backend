const LEVEL_RULES = {
  beginner: {
    key: "beginner",
    label: "Beginner",
    aliases: ["fresher", "junior"],
    preferredDifficulties: ["easy", "medium"],
    defaultDifficulty: "easy",
    followUpThreshold: 76,
    topicDepth: "foundational",
    answerExpectation:
      "Focus on fundamentals, practical understanding, and simple real-world examples.",
  },
  intermediate: {
    key: "intermediate",
    label: "Intermediate",
    aliases: ["mid"],
    preferredDifficulties: ["medium", "hard"],
    defaultDifficulty: "medium",
    followUpThreshold: 74,
    topicDepth: "applied",
    answerExpectation:
      "Focus on implementation tradeoffs, project decisions, debugging, and hands-on execution.",
  },
  advanced: {
    key: "advanced",
    label: "Advanced",
    aliases: ["senior"],
    preferredDifficulties: ["medium", "hard"],
    defaultDifficulty: "hard",
    followUpThreshold: 72,
    topicDepth: "strategic",
    answerExpectation:
      "Focus on architecture, tradeoffs, leadership, risk handling, and production-level judgment.",
  },
};

const resolveLevelRule = (experienceLevel = "junior") => {
  const normalizedLevel = String(experienceLevel || "").toLowerCase().trim();

  return (
    Object.values(LEVEL_RULES).find((rule) => rule.aliases.includes(normalizedLevel)) ||
    LEVEL_RULES.beginner
  );
};

module.exports = {
  LEVEL_RULES,
  resolveLevelRule,
};
