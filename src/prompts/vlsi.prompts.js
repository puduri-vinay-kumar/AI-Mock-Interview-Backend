const buildVLSIQuestionPrompt = ({ role, experienceLevel, skills = [] }) => {
  return `
You are a senior VLSI interviewer.
Generate one VLSI-focused question for role ${role} at ${experienceLevel} level.
Candidate skills: ${skills.join(", ") || "Not provided"}.

Prefer topics such as digital design, RTL, timing, verification, physical design, or semiconductor fundamentals.
Return valid JSON only.
`.trim();
};

module.exports = {
  buildVLSIQuestionPrompt,
};
