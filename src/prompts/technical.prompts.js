const buildTechnicalQuestionPrompt = ({
  role,
  experienceLevel,
  skills = [],
  previousScore = 0,
  interviewType,
}) => {
  return `
You are an expert technical interviewer.
Generate a concise interview question for a ${role} candidate.
Experience level: ${experienceLevel}.
Interview type: ${interviewType}.
Relevant resume skills: ${skills.join(", ") || "Not provided"}.
Previous performance score: ${previousScore}.

Balance difficulty with the candidate's performance. Include a topic and whether a follow-up is useful.
Return valid JSON only.
`.trim();
};

module.exports = {
  buildTechnicalQuestionPrompt,
};
