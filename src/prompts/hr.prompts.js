const buildHRQuestionPrompt = ({ role, experienceLevel, previousScore = 0 }) => {
  return `
You are an experienced HR interviewer.
Generate one interview question for a ${role} candidate at ${experienceLevel} level.
Previous performance score: ${previousScore}.

Focus on communication, ownership, teamwork, and self-awareness.
Return valid JSON only.
`.trim();
};

module.exports = {
  buildHRQuestionPrompt,
};
