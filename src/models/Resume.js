const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    extractedSkills: {
      type: [String],
      default: [],
    },
    rawText: {
      type: String,
      default: "",
    },
    parsedData: {
      summary: { type: String, default: "" },
      skills: { type: [String], default: [] },
      education: { type: [String], default: [] },
      projects: { type: [String], default: [] },
      technologies: { type: [String], default: [] },
      experience: { type: [String], default: [] },
    },
    parserMeta: {
      fileType: { type: String, default: "" },
      parserUsed: { type: String, default: "" },
      aiEnhanced: { type: Boolean, default: false },
      parsedAt: { type: Date, default: Date.now },
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model("Resume", resumeSchema);
