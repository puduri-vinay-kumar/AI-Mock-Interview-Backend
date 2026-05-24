const bcrypt = require("bcrypt");
const User = require("../models/User");
const Interview = require("../models/Interview");
const Report = require("../models/Report");
const asyncHandler = require("../middleware/async.middleware");
const { successResponse } = require("../utils/responseHandler");

exports.getProfile = asyncHandler(async (req, res) => {
  return successResponse(res, "User profile fetched successfully", {
    user: req.user,
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar, password } = req.body;

  if (name !== undefined) {
    req.user.name = name;
  }

  if (avatar !== undefined) {
    req.user.avatar = avatar;
  }

  if (password) {
    req.user.password = await bcrypt.hash(password, 12);
  }

  const updatedUser = await req.user.save();

  return successResponse(res, "User profile updated successfully", {
    user: updatedUser,
  });
});

exports.getUserHistory = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  const interviewIds = interviews.map((interview) => interview._id);
  const reports = await Report.find({ interviewId: { $in: interviewIds } }).lean();

  const reportMap = new Map(
    reports.map((report) => [String(report.interviewId), report])
  );

  const history = interviews.map((interview) => ({
    ...interview,
    report: reportMap.get(String(interview._id)) || null,
  }));

  return successResponse(res, "User interview history fetched successfully", {
    total: history.length,
    history,
  });
});
