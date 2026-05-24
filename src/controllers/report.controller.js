const mongoose = require("mongoose");
const Report = require("../models/Report");
const Interview = require("../models/Interview");
const asyncHandler = require("../middleware/async.middleware");
const { successResponse } = require("../utils/responseHandler");

exports.getReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const query = mongoose.isValidObjectId(id)
    ? { $or: [{ _id: id }, { interviewId: id }] }
    : { _id: null };

  const report = await Report.findOne(query).populate({
    path: "interviewId",
    select: "userId role experienceLevel interviewType status createdAt",
  });

  if (!report) {
    const error = new Error("Report not found");
    error.statusCode = 404;
    throw error;
  }

  const interview = report.interviewId;
  if (String(interview.userId || "") && String(interview.userId) !== String(req.user._id) && req.user.role !== "admin") {
    const error = new Error("Not authorized to access this report");
    error.statusCode = 403;
    throw error;
  }

  return successResponse(res, "Report fetched successfully", {
    report,
  });
});

exports.getReportsByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (String(userId) !== String(req.user._id) && req.user.role !== "admin") {
    const error = new Error("Not authorized to access these reports");
    error.statusCode = 403;
    throw error;
  }

  const interviews = await Interview.find({ userId }).select("_id").lean();
  const interviewIds = interviews.map((interview) => interview._id);
  const reports = await Report.find({ interviewId: { $in: interviewIds } }).sort({
    createdAt: -1,
  });

  return successResponse(res, "User reports fetched successfully", {
    total: reports.length,
    reports,
  });
});
