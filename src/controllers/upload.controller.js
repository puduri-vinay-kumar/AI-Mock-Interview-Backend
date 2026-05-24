const Resume = require("../models/Resume");
const asyncHandler = require("../middleware/async.middleware");
const { successResponse } = require("../utils/responseHandler");
const { analyzeResume } = require("../services/ai/resumeAnalyzer");

exports.uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error("Resume file is required");
    error.statusCode = 400;
    throw error;
  }

  const analysis = await analyzeResume({
    filePath: req.file.path,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
  });

  const resume = await Resume.create({
    userId: req.user._id,
    fileName: req.file.originalname,
    filePath: req.file.path,
    extractedSkills: analysis.skills,
    rawText: analysis.rawText,
    parsedData: {
      summary: analysis.summary,
      skills: analysis.skills,
      education: analysis.education,
      projects: analysis.projects,
      technologies: analysis.technologies,
      experience: analysis.experience,
    },
    parserMeta: {
      fileType: analysis.fileType,
      parserUsed: analysis.parserUsed,
      aiEnhanced: analysis.aiEnhanced,
      parsedAt: new Date(),
    },
  });

  return successResponse(res, "Resume uploaded successfully", {
    resume,
    analysis,
  }, 201);
});
