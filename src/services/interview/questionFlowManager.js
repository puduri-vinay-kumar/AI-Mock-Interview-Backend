const { generateInterviewQuestion } = require("../ai/questionGenerator");

const deriveResumeSkills = (resumeProfile) => {
  if (!resumeProfile) {
    return [];
  }

  return resumeProfile.extractedSkills?.length
    ? resumeProfile.extractedSkills
    : resumeProfile.parsedData?.skills || [];
};

const buildNextQuestion = async ({
  interview,
  newDifficulty,
  nextTopic,
  previousScore,
  resumeProfile,
  questionIndex,
}) => {
  const skills = deriveResumeSkills(resumeProfile);

  return generateInterviewQuestion({
    role: interview.role,
    experienceLevel: interview.experienceLevel,
    interviewType: interview.interviewType,
    skills,
    previousScore,
    topic: nextTopic,
    currentDifficulty: newDifficulty,
    questionIndex: Number(questionIndex) || 1,
    isOpeningQuestion: false,
  });
};

module.exports = {
  deriveResumeSkills,
  buildNextQuestion,
};
