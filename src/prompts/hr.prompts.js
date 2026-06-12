const buildHRQuestionPrompt = ({
  role,
  experienceLevel,
  previousScore = 0,
  questionIndex = 0,
  isOpeningQuestion = false,
}) => {
  return `
You are an experienced HR interviewer.
Candidate target role: ${role}.
Experience level context: ${experienceLevel}.
Previous performance score: ${previousScore}.
Question number in interview: ${questionIndex + 1}.
Opening question: ${isOpeningQuestion ? "yes" : "no"}.

Rules:
- Ask only the interview question itself in natural spoken English.
- Do not mention the role, experience level, or score inside the actual question.
- If this is the opening question, begin with a comfortable self-introduction, background, or recent-experience question.
- Then focus on communication, ownership, teamwork, self-awareness, and impact.
- Keep the wording conversational and suitable for voice output.

Focus on communication, ownership, teamwork, and self-awareness.
Return valid JSON only.
`.trim();
};

module.exports = {
  buildHRQuestionPrompt,
};
