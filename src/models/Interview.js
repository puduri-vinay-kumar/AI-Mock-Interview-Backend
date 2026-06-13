const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    type: {
      type: String,
      enum: ["technical", "behavioral", "coding", "system-design", "vlsi", "hr"],
      default: "technical",
    },
    topic: { type: String, default: "" },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    followUpPossible: { type: Boolean, default: true },
    source: {
      type: String,
      enum: ["ai", "fallback", "manual", "curated"],
      default: "ai",
    },
    expectedAnswer: { type: String, default: "" },
  },
  { _id: false }
);

const answerEvaluationSchema = new mongoose.Schema(
  {
    score: { type: Number, default: 0, min: 0, max: 100 },
    technicalAccuracy: { type: Number, default: 0, min: 0, max: 100 },
    clarity: { type: Number, default: 0, min: 0, max: 100 },
    communication: { type: Number, default: 0, min: 0, max: 100 },
    confidence: { type: Number, default: 0, min: 0, max: 100 },
    depthOfExplanation: { type: Number, default: 0, min: 0, max: 100 },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    confidenceLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    topic: { type: String, default: "" },
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, default: "" },
    transcript: { type: String, default: "" },
    durationSeconds: { type: Number, default: 0 },
    evaluation: {
      type: answerEvaluationSchema,
      default: () => ({}),
    },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const scoreSchema = new mongoose.Schema(
  {
    technicalKnowledge: { type: Number, default: 0, min: 0, max: 100 },
    communication: { type: Number, default: 0, min: 0, max: 100 },
    confidence: { type: Number, default: 0, min: 0, max: 100 },
    problemSolving: { type: Number, default: 0, min: 0, max: 100 },
    conceptualClarity: { type: Number, default: 0, min: 0, max: 100 },
    overallScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    summary: { type: String, default: "" },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    suggestedLearnings: { type: [String], default: [] },
  },
  { _id: false }
);

const transcriptEntrySchema = new mongoose.Schema(
  {
    speaker: {
      type: String,
      enum: ["ai", "user", "system"],
      default: "user",
    },
    text: { type: String, default: "" },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const adaptiveHistorySchema = new mongoose.Schema(
  {
    questionId: { type: String, default: "" },
    previousDifficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    newDifficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    previousTopic: { type: String, default: "" },
    newTopic: { type: String, default: "" },
    reason: { type: String, default: "" },
    score: { type: Number, default: 0, min: 0, max: 100 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const sessionStateSchema = new mongoose.Schema(
  {
    currentQuestionIndex: { type: Number, default: 0, min: 0 },
    targetQuestionCount: { type: Number, default: 5, min: 1 },
    askedQuestionIds: { type: [String], default: [] },
    currentTopic: { type: String, default: "" },
    completedTopics: { type: [String], default: [] },
    repeatedMistakeTopics: { type: [String], default: [] },
    lastScoreDelta: { type: Number, default: 0 },
    mode: {
      type: String,
      enum: ["rest", "socket", "voice"],
      default: "rest",
    },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: [true, "Target role is required"],
      trim: true,
    },
    experienceLevel: {
      type: String,
      enum: ["fresher", "junior", "mid", "senior"],
      default: "junior",
    },
    interviewType: {
      type: String,
      enum: ["technical", "hr", "behavioral", "coding", "mixed"],
      required: [true, "Interview type is required"],
    },
    duration: {
      type: Number,
      default: 15,
      min: 5,
      max: 180,
    },
    questionCount: {
      type: Number,
      required: [true, "Question count is required"],
      min: 1,
      max: 20,
      default: 5,
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
    },
    currentDifficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    scores: {
      type: scoreSchema,
      default: () => ({}),
    },
    feedback: {
      type: feedbackSchema,
      default: () => ({}),
    },
    liveTranscript: {
      type: [transcriptEntrySchema],
      default: [],
    },
    adaptiveHistory: {
      type: [adaptiveHistorySchema],
      default: [],
    },
    sessionState: {
      type: sessionStateSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Interview", interviewSchema);
