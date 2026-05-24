const bcrypt = require("bcrypt");
const User = require("../models/User");
const asyncHandler = require("../middleware/async.middleware");
const { successResponse } = require("../utils/responseHandler");
const generateToken = require("../utils/generateToken");

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  interviewsAttempted: user.interviewsAttempted,
  averageScore: user.averageScore,
  createdAt: user.createdAt,
});

const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: String(process.env.COOKIE_SECURE) === "true",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role, avatar } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("User already exists with this email");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || "candidate",
    avatar,
  });

  const token = generateToken(user._id);
  setAuthCookie(res, token);

  return successResponse(res, "User registered successfully", {
    user: sanitizeUser(user),
    token,
  }, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user._id);
  setAuthCookie(res, token);

  return successResponse(res, "Login successful", {
    user: sanitizeUser(user),
    token,
  });
});

exports.getCurrentUser = asyncHandler(async (req, res) => {
  return successResponse(res, "Authenticated user fetched successfully", {
    user: sanitizeUser(req.user),
  });
});
