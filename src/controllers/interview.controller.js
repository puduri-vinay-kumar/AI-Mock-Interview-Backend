const Interview = require("../models/Interview");
const Report = require("../models/Report");
const User = require("../models/User");
const Resume = require("../models/Resume");
const asyncHandler = require("../middleware/async.middleware");
const { successResponse } = require("../utils/responseHandler");
const {
  bootstrapInterviewSession,
  syncInterviewProgress,
  processRealtimeAnswer,
  finalizeInterviewSession,
} = require("../services/interview/interviewSessionManager");

const updateCompletedInterviewStats = async (userId, fallbackOverallScore = 0) => {
  const stats = await Interview.aggregate([
    { $match: { userId, status: "completed" } },
    {
      $group: {
        _id: "$userId",
        averageScore: { $avg: "$scores.overallScore" },
        total: { $sum: 1 },
      },
    },
  ]);

  const averageScore = stats[0]?.averageScore || fallbackOverallScore;
  const interviewsAttempted = stats[0]?.total || 1;

  await User.findByIdAndUpdate(userId, {
    averageScore: Number(averageScore.toFixed(2)),
    interviewsAttempted,
  });
};

exports.createInterview = asyncHandler(async (req, res) => {
  const { role, experienceLevel, interviewType, duration, resumeId, previousScore } =
    req.body;

  const resume = resumeId
    ? await Resume.findOne({ _id: resumeId, userId: req.user._id })
    : await Resume.findOne({ userId: req.user._id }).sort({ uploadedAt: -1 });

  const sessionPayload = await bootstrapInterviewSession({
    userId: req.user._id,
    role,
    experienceLevel,
    interviewType,
    duration,
    resumeProfile: resume,
    previousScore: previousScore ?? req.user.averageScore ?? 0,
  });

  const interview = await Interview.create(sessionPayload.interviewPayload);

  return successResponse(res, "Interview created successfully", {
    interview,
    session: sessionPayload.sessionMeta,
  }, 201);
});

exports.getInterviewById = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!interview) {
    const error = new Error("Interview not found");
    error.statusCode = 404;
    throw error;
  }

  return successResponse(res, "Interview fetched successfully", {
    interview,
  });
});

exports.getInterviewHistory = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });

  return successResponse(res, "Interview history fetched successfully", {
    total: interviews.length,
    interviews,
  });
});

exports.updateInterviewStatus = asyncHandler(async (req, res) => {
  const { status, answers, liveTranscript } = req.body;

  const interview = await Interview.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!interview) {
    const error = new Error("Interview not found");
    error.statusCode = 404;
    throw error;
  }

  const progressUpdate = await syncInterviewProgress({
    interview,
    answers: answers || [],
    liveTranscript: liveTranscript || [],
    requestedStatus: status,
  });

  interview.status = progressUpdate.status;
  interview.answers = progressUpdate.answers;
  interview.scores = progressUpdate.scores;
  interview.feedback = progressUpdate.feedback;
  interview.questions = progressUpdate.questions;
  interview.currentDifficulty = progressUpdate.currentDifficulty;
  interview.sessionState = progressUpdate.sessionState;
  interview.liveTranscript = progressUpdate.liveTranscript;
  interview.adaptiveHistory = progressUpdate.adaptiveHistory;

  const updatedInterview = await interview.save();

  let report = await Report.findOne({ interviewId: updatedInterview._id });
  if (progressUpdate.status === "completed") {
    const reportPayload = await finalizeInterviewSession(updatedInterview);

    report = await Report.findOneAndUpdate(
      { interviewId: updatedInterview._id },
      reportPayload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await updateCompletedInterviewStats(req.user._id, reportPayload.overallScore);
  }

  return successResponse(res, "Interview status updated successfully", {
    interview: updatedInterview,
    report,
    nextQuestion: progressUpdate.nextQuestion || null,
  });
});

exports.submitInterviewAnswer = asyncHandler(async (req, res) => {
  const { answer, transcript, durationSeconds } = req.body;

  const interview = await Interview.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!interview) {
    const error = new Error("Interview not found");
    error.statusCode = 404;
    throw error;
  }

  const currentQuestion =
    interview.questions[interview.sessionState?.currentQuestionIndex || 0];

  if (!currentQuestion) {
    const error = new Error("No active question found for this interview");
    error.statusCode = 409;
    throw error;
  }

  const progressUpdate = await processRealtimeAnswer({
    interview,
    answerPayload: {
      questionId: currentQuestion.questionId,
      question: currentQuestion.question,
      answer,
      transcript: transcript || answer,
      durationSeconds: durationSeconds || 0,
    },
    transcriptEntry: transcript
      ? {
          speaker: "user",
          text: transcript,
          confidence: 0.88,
          timestamp: new Date(),
        }
      : null,
  });

  interview.status = progressUpdate.status;
  interview.answers = progressUpdate.answers;
  interview.scores = progressUpdate.scores;
  interview.feedback = progressUpdate.feedback;
  interview.questions = progressUpdate.questions;
  interview.currentDifficulty = progressUpdate.currentDifficulty;
  interview.sessionState = progressUpdate.sessionState;
  interview.liveTranscript = progressUpdate.liveTranscript;
  interview.adaptiveHistory = progressUpdate.adaptiveHistory;

  const updatedInterview = await interview.save();

  return successResponse(res, "Interview answer submitted successfully", {
    interview: updatedInterview,
    nextQuestion: progressUpdate.nextQuestion || null,
    latestEvaluation:
      progressUpdate.answers[progressUpdate.answers.length - 1]?.evaluation || null,
  });
});

exports.appendInterviewTranscript = asyncHandler(async (req, res) => {
  const { entries } = req.body;

  const interview = await Interview.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!interview) {
    const error = new Error("Interview not found");
    error.statusCode = 404;
    throw error;
  }

  interview.liveTranscript = [...(interview.liveTranscript || []), ...(entries || [])].slice(
    -200
  );
  await interview.save();

  return successResponse(res, "Transcript updated successfully", {
    transcriptCount: interview.liveTranscript.length,
    liveTranscript: interview.liveTranscript,
  });
});

exports.completeInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!interview) {
    const error = new Error("Interview not found");
    error.statusCode = 404;
    throw error;
  }

  interview.status = "completed";
  const reportPayload = await finalizeInterviewSession(interview);
  await interview.save();
  const report = await Report.findOneAndUpdate(
    { interviewId: interview._id },
    reportPayload,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await updateCompletedInterviewStats(req.user._id, reportPayload.overallScore);

  return successResponse(res, "Interview completed successfully", {
    interview,
    report,
  });
});
