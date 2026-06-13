const buildVLSIQuestionPrompt = ({
  role,
  experienceLevel,
  skills = [],
  questionIndex = 0,
  isOpeningQuestion = false,
  topic,
  domainTopics = [],
  forbiddenTopics = [],
  priorQuestions = [],
  allowedQuestionTypes = [],
  levelRule,
  interviewState,
}) => {
  return `
You are a senior VLSI interviewer.
Candidate target role: ${role}.
Experience level context: ${experienceLevel}.
Candidate skills: ${skills.join(", ") || "Not provided"}.
Question number in interview: ${questionIndex + 1}.
Preferred topic: ${topic || "Choose the most suitable topic"}.
Allowed VLSI topics: ${domainTopics.join(", ") || "Use the role and skills to stay on-domain"}.
Allowed question types: ${allowedQuestionTypes.join(", ") || "technical, vlsi"}.
Avoid these off-domain areas: ${forbiddenTopics.join(", ") || "None"}.
Previously asked questions: ${priorQuestions.join(" | ") || "None"}.
Interview stage: ${interviewState?.stage || "core-screen"}.
Level guidance: ${levelRule?.label || "Beginner"}.
Level answer expectation: ${levelRule?.answerExpectation || "Focus on clean conceptual explanations and practical examples."}
Opening question: ${isOpeningQuestion ? "yes" : "no"}.

Rules:
- Ask only the interview question itself in natural spoken English.
- Do not mention the role or experience level inside the actual question wording.
- Stay strictly within VLSI, RTL, verification, timing, physical design, or semiconductor fundamentals.
- Do not ask unrelated software or frontend/backend web development questions.
- Do not repeat or closely paraphrase any previously asked question.
- If this is the opening question, begin with background, project, or hands-on experience before deep VLSI theory.
- If interview stage is follow-up, ask for deeper reasoning on the same circuit, timing, verification, or implementation topic.
- For later questions, prefer topics such as digital design, RTL, timing, verification, physical design, or semiconductor fundamentals.
- Keep the wording voice-friendly and concise.

Prefer topics such as digital design, RTL, timing, verification, physical design, or semiconductor fundamentals.
Return strict JSON only with exactly these keys: question, difficulty, topic, followUpPossible, type, expectedAnswer.
`.trim();
};

module.exports = {
  buildVLSIQuestionPrompt,
};
