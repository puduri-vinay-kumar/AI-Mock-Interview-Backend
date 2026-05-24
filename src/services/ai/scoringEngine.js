const clampScore = (value) => Math.max(0, Math.min(100, Number(value) || 0));

const calculateWeightedScores = (evaluations = []) => {
  if (!evaluations.length) {
    return {
      technicalKnowledge: 0,
      communication: 0,
      confidence: 0,
      problemSolving: 0,
      conceptualClarity: 0,
      overallScore: 0,
      percentileEstimate: 0,
      overallRating: "Not Started",
    };
  }

  const totals = evaluations.reduce(
    (acc, item) => {
      acc.technicalKnowledge += item.technicalAccuracy;
      acc.communication += item.communication;
      acc.confidence += item.confidence;
      acc.problemSolving += item.depthOfExplanation;
      acc.conceptualClarity += item.clarity;
      acc.overallScore += item.score;
      return acc;
    },
    {
      technicalKnowledge: 0,
      communication: 0,
      confidence: 0,
      problemSolving: 0,
      conceptualClarity: 0,
      overallScore: 0,
    }
  );

  const size = evaluations.length;
  const normalized = {
    technicalKnowledge: clampScore(totals.technicalKnowledge / size),
    communication: clampScore(totals.communication / size),
    confidence: clampScore(totals.confidence / size),
    problemSolving: clampScore(totals.problemSolving / size),
    conceptualClarity: clampScore(totals.conceptualClarity / size),
    overallScore: clampScore(totals.overallScore / size),
  };

  const weightedOverall = clampScore(
    normalized.technicalKnowledge * 0.3 +
      normalized.communication * 0.2 +
      normalized.confidence * 0.15 +
      normalized.problemSolving * 0.2 +
      normalized.conceptualClarity * 0.15
  );

  const percentileEstimate = clampScore(Math.round(weightedOverall * 0.92));
  const overallRating =
    weightedOverall >= 85
      ? "Excellent"
      : weightedOverall >= 70
        ? "Strong"
        : weightedOverall >= 55
          ? "Developing"
          : "Needs Improvement";

  return {
    ...normalized,
    overallScore: weightedOverall,
    percentileEstimate,
    overallRating,
  };
};

module.exports = {
  calculateWeightedScores,
};
