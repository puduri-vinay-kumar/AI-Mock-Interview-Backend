const buildEvaluationPrompt = ({
  role,
  interviewType,
  question,
  difficulty,
  expectedAnswer,
}) => {
  return `
You are evaluating a mock interview answer for role ${role}.
Interview type: ${interviewType}.
Question: ${question}
Difficulty: ${difficulty}
Expected answer guidance: ${expectedAnswer || "Not provided"}.

Score the answer on technical accuracy, clarity, communication, confidence, and depth of explanation.
Return valid JSON only.
`.trim();
};

const buildFeedbackPrompt = ({ role, interviewType, answersCount }) => {
  return `
You are generating interview feedback for a ${role} candidate.
Interview type: ${interviewType}.
Total answers evaluated: ${answersCount}.

Provide balanced strengths, weaknesses, suggestions, and a concise summary.
Return valid JSON only.
`.trim();
};

const buildResumeAnalysisPrompt = ({ fileName }) => {
  return `
Extract resume information from the provided text for file "${fileName}".
Return structured JSON with summary, skills, education, projects, technologies, and experience.
Do not invent achievements not grounded in the text.
`.trim();
};

const buildReportPrompt = ({ role, interviewType }) => {
  return `
Generate a final interview report for role ${role} and interview type ${interviewType}.
Return valid JSON with detailed analysis, topic scores, radar metrics, learning recommendations, and rating.
`.trim();
};

module.exports = {
  buildEvaluationPrompt,
  buildFeedbackPrompt,
  buildResumeAnalysisPrompt,
  buildReportPrompt,
};
