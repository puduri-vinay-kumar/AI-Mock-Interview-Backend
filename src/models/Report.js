const mongoose = require("mongoose");

const topicScoreSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    score: { type: Number, default: 0, min: 0, max: 100 },
    comments: { type: String, default: "" },
  },
  { _id: false }
);

const radarMetricSchema = new mongoose.Schema(
  {
    technicalKnowledge: { type: Number, default: 0, min: 0, max: 100 },
    communication: { type: Number, default: 0, min: 0, max: 100 },
    confidence: { type: Number, default: 0, min: 0, max: 100 },
    problemSolving: { type: Number, default: 0, min: 0, max: 100 },
    conceptualClarity: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
      unique: true,
    },
    technicalKnowledge: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    communication: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    problemSolving: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    conceptualClarity: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    suggestedLearnings: {
      type: [String],
      default: [],
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    detailedAnalysis: {
      summary: { type: String, default: "" },
      communicationNotes: { type: String, default: "" },
      technicalNotes: { type: String, default: "" },
      behavioralNotes: { type: String, default: "" },
      improvementPlan: { type: String, default: "" },
      percentileEstimate: { type: Number, default: 0, min: 0, max: 100 },
      overallRating: { type: String, default: "Developing" },
    },
    topicScores: {
      type: [topicScoreSchema],
      default: [],
    },
    radarMetrics: {
      type: radarMetricSchema,
      default: () => ({}),
    },
    learningRecommendations: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Report", reportSchema);
