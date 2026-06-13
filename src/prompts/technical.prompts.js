const buildTechnicalQuestionPrompt = ({
  role,
  experienceLevel,
  skills = [],
  previousScore = 0,
  interviewType,
  questionIndex = 0,
  isOpeningQuestion = false,
  topic,
  domainLabel,
  domainTopics = [],
  forbiddenTopics = [],
  priorQuestions = [],
}) => {
  return `
You are an expert technical interviewer.
Candidate target role: ${role}.
Experience level context: ${experienceLevel}.
Interview type: ${interviewType}.
Interview domain: ${domainLabel || "General Technical"}.
Relevant resume skills: ${skills.join(", ") || "Not provided"}.
Previous performance score: ${previousScore}.
Question number in interview: ${questionIndex + 1}.
Preferred topic: ${topic || "Choose the most suitable topic"}.
Allowed domain topics: ${domainTopics.join(", ") || "Use the role and skills to stay on-domain"}.
Avoid these off-domain areas: ${forbiddenTopics.join(", ") || "None"}.
Previously asked questions: ${priorQuestions.join(" | ") || "None"}.
Opening question: ${isOpeningQuestion ? "yes" : "no"}.

Rules:
- Ask only the interview question itself in natural spoken English.
- Do not mention the candidate's role, experience level, or score inside the question wording.
- Do not say phrases like "as a ${experienceLevel} candidate" or "for this ${role} role".
- Stay strictly inside the interview domain and relevant skills.
- Do not ask questions from unrelated domains.
- Do not repeat or closely paraphrase any previously asked question.
- If this is the opening question, start with a warm introduction-style prompt about the candidate's background, skills, recent work, or experience before deep technical questions.
- If this is not the opening question, ask one focused technical question tied to skills, projects, or the current topic.
- Keep it concise and interviewer-like, suitable for voice output.
- Avoid stacked multi-part questions unless a follow-up is truly useful.

Balance difficulty with the candidate's performance. Include a topic and whether a follow-up is useful.
Return valid JSON only.
`.trim();
};

module.exports = {
  buildTechnicalQuestionPrompt,
};
