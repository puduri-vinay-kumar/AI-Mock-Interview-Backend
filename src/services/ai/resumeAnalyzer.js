const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const {
  createStructuredResponse,
  isAIProviderConfigured,
} = require("./provider.service");
const { buildResumeAnalysisPrompt } = require("./promptTemplates");

const resumeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    education: { type: "array", items: { type: "string" } },
    projects: { type: "array", items: { type: "string" } },
    technologies: { type: "array", items: { type: "string" } },
    experience: { type: "array", items: { type: "string" } },
  },
  required: [
    "summary",
    "skills",
    "education",
    "projects",
    "technologies",
    "experience",
  ],
};

const dedupe = (items = []) => Array.from(new Set(items.filter(Boolean))).slice(0, 12);

const parsePdf = async (filePath) => {
  const buffer = await fs.promises.readFile(filePath);
  const result = await pdfParse(buffer);
  return result.text;
};

const parseDocx = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
};

const extractFallbackSkills = (rawText) => {
  const glossary = [
    "javascript",
    "typescript",
    "node.js",
    "express",
    "mongodb",
    "mongoose",
    "react",
    "python",
    "java",
    "c++",
    "sql",
    "redis",
    "socket.io",
    "verilog",
    "systemverilog",
    "vlsi",
    "rtl",
    "dsa",
  ];

  const normalizedText = rawText.toLowerCase();
  return glossary
    .filter((term) => normalizedText.includes(term))
    .map((term) => term.replace(/\b\w/g, (char) => char.toUpperCase()));
};

const splitSections = (rawText, heading) => {
  const regex = new RegExp(`${heading}[\\s\\S]{0,500}`, "i");
  const match = rawText.match(regex);
  if (!match) {
    return [];
  }

  return match[0]
    .split(/\n|•|-/)
    .map((item) => item.trim())
    .filter((item) => item.length > 3)
    .slice(1, 6);
};

const fallbackResumeAnalysis = (rawText, fileName, fileType, parserUsed) => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    summary: lines.slice(0, 3).join(" ").slice(0, 280),
    skills: dedupe(extractFallbackSkills(rawText)),
    education: splitSections(rawText, "education"),
    projects: splitSections(rawText, "projects"),
    technologies: dedupe(extractFallbackSkills(rawText)),
    experience: splitSections(rawText, "experience"),
    rawText,
    fileType,
    parserUsed,
    aiEnhanced: false,
    fileName,
  };
};

const analyzeResume = async ({ filePath, originalName, mimeType }) => {
  const fileExtension = path.extname(originalName).toLowerCase();
  let rawText = "";
  let parserUsed = "unknown";

  if (mimeType === "application/pdf" || fileExtension === ".pdf") {
    rawText = await parsePdf(filePath);
    parserUsed = "pdf-parse";
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileExtension === ".docx"
  ) {
    rawText = await parseDocx(filePath);
    parserUsed = "mammoth";
  } else if (mimeType === "application/msword" || fileExtension === ".doc") {
    rawText = await fs.promises.readFile(filePath, "utf8").catch(() => "");
    parserUsed = "legacy-doc-fallback";
  } else {
    const error = new Error("Unsupported resume format");
    error.statusCode = 400;
    throw error;
  }

  const trimmedText = rawText.trim();
  if (!trimmedText) {
    const error = new Error("Unable to extract text from uploaded resume");
    error.statusCode = 422;
    throw error;
  }

  if (isAIProviderConfigured()) {
    const aiResult = await createStructuredResponse({
      name: "resume_analysis",
      schema: resumeSchema,
      instructions: buildResumeAnalysisPrompt({ fileName: originalName }),
      input: trimmedText.slice(0, 18000),
    });

    if (aiResult) {
      return {
        ...aiResult,
        rawText: trimmedText,
        fileType: fileExtension.replace(".", "") || mimeType,
        parserUsed,
        aiEnhanced: true,
      };
    }
  }

  return fallbackResumeAnalysis(
    trimmedText,
    originalName,
    fileExtension.replace(".", "") || mimeType,
    parserUsed
  );
};

module.exports = {
  analyzeResume,
};
