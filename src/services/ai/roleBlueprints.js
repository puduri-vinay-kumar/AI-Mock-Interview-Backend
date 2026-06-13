const ROLE_BLUEPRINTS = {
  frontend: {
    key: "frontend",
    label: "Frontend Engineering",
    aliases: ["frontend", "front end", "ui developer", "react developer", "web developer"],
    allowedQuestionTypes: ["behavioral", "technical", "coding", "system-design"],
    starterTopics: [
      "introduction",
      "react",
      "javascript",
      "component design",
      "state management",
    ],
    coreTopics: [
      "react",
      "javascript",
      "typescript",
      "component architecture",
      "state management",
      "frontend performance",
      "accessibility",
      "api integration",
      "testing",
      "css",
      "html",
    ],
    forbiddenKeywords: [
      "mongodb schema",
      "sql joins",
      "kubernetes",
      "message queue",
      "redis cluster",
      "microservices choreography",
      "verilog",
      "timing closure",
    ],
  },
  backend: {
    key: "backend",
    label: "Backend Engineering",
    aliases: ["backend", "back end", "server", "api developer", "node developer"],
    allowedQuestionTypes: ["behavioral", "technical", "coding", "system-design"],
    starterTopics: [
      "introduction",
      "node.js",
      "apis",
      "databases",
      "authentication",
    ],
    coreTopics: [
      "node.js",
      "express",
      "api design",
      "authentication",
      "authorization",
      "mongodb",
      "sql",
      "caching",
      "scalability",
      "performance",
      "testing",
      "system design",
    ],
    forbiddenKeywords: [
      "css animation",
      "dom events",
      "react hooks",
      "accessibility aria",
      "figma handoff",
      "verilog",
      "timing analysis",
    ],
  },
  fullstack: {
    key: "fullstack",
    label: "Full Stack Engineering",
    aliases: ["full stack", "fullstack", "mern", "mean"],
    allowedQuestionTypes: ["behavioral", "technical", "coding", "system-design"],
    starterTopics: [
      "introduction",
      "project architecture",
      "react",
      "node.js",
      "api integration",
    ],
    coreTopics: [
      "react",
      "javascript",
      "node.js",
      "api design",
      "authentication",
      "databases",
      "deployment",
      "performance",
      "testing",
      "system design",
    ],
    forbiddenKeywords: ["verilog", "timing closure", "semiconductor fabrication"],
  },
  "data-analyst": {
    key: "data-analyst",
    label: "Data Analysis",
    aliases: ["data analyst", "business analyst", "analytics", "bi analyst"],
    allowedQuestionTypes: ["behavioral", "technical", "coding", "system-design"],
    starterTopics: [
      "introduction",
      "sql",
      "excel",
      "dashboards",
      "analytics projects",
    ],
    coreTopics: [
      "sql",
      "excel",
      "statistics",
      "data cleaning",
      "dashboards",
      "visualization",
      "business metrics",
      "experimentation",
      "python analytics",
    ],
    forbiddenKeywords: [
      "react hooks",
      "verilog",
      "timing analysis",
      "distributed cache invalidation",
    ],
  },
  devops: {
    key: "devops",
    label: "DevOps and Platform Engineering",
    aliases: ["devops", "platform engineer", "site reliability", "sre", "cloud engineer"],
    allowedQuestionTypes: ["behavioral", "technical", "coding", "system-design"],
    starterTopics: [
      "introduction",
      "ci cd",
      "cloud infrastructure",
      "monitoring",
      "deployments",
    ],
    coreTopics: [
      "ci cd",
      "docker",
      "kubernetes",
      "cloud infrastructure",
      "monitoring",
      "incident response",
      "infrastructure as code",
      "networking",
      "security",
      "observability",
    ],
    forbiddenKeywords: ["react hooks", "css", "verilog", "layout timing", "semiconductor"],
  },
  vlsi: {
    key: "vlsi",
    label: "VLSI Engineering",
    aliases: ["vlsi", "rtl", "asic", "physical design", "verification", "verilog"],
    allowedQuestionTypes: ["behavioral", "technical", "vlsi"],
    starterTopics: [
      "introduction",
      "rtl design",
      "verification",
      "digital design",
      "projects",
    ],
    coreTopics: [
      "digital design",
      "rtl",
      "verilog",
      "systemverilog",
      "timing analysis",
      "verification",
      "physical design",
      "clock domains",
      "synthesis",
      "semiconductor fundamentals",
    ],
    forbiddenKeywords: [
      "react hooks",
      "css",
      "mongodb",
      "express middleware",
      "rest api",
      "ui components",
    ],
  },
  hr: {
    key: "hr",
    label: "HR and Behavioral",
    aliases: ["hr", "behavioral"],
    allowedQuestionTypes: ["behavioral", "hr"],
    starterTopics: [
      "introduction",
      "experience",
      "strengths",
      "teamwork",
      "ownership",
    ],
    coreTopics: [
      "introduction",
      "experience",
      "strengths",
      "teamwork",
      "ownership",
      "conflict resolution",
      "career goals",
      "communication",
    ],
    forbiddenKeywords: [],
  },
  general: {
    key: "general",
    label: "General Technical",
    aliases: [],
    allowedQuestionTypes: ["behavioral", "technical", "coding", "system-design"],
    starterTopics: ["introduction", "projects", "fundamentals", "problem solving"],
    coreTopics: ["fundamentals", "projects", "problem solving", "design", "debugging"],
    forbiddenKeywords: [],
  },
};

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const resolveRoleBlueprint = ({ role = "", interviewType = "", skills = [] }) => {
  const normalizedRole = normalizeText(role);
  const normalizedSkillText = normalizeText(skills.join(" "));
  const normalizedInterviewType = normalizeText(interviewType);

  if (normalizedInterviewType.includes("hr") || normalizedInterviewType.includes("behavioral")) {
    return ROLE_BLUEPRINTS.hr;
  }

  return (
    Object.values(ROLE_BLUEPRINTS).find((blueprint) =>
      blueprint.aliases.some(
        (alias) =>
          normalizedRole.includes(normalizeText(alias)) ||
          normalizedSkillText.includes(normalizeText(alias))
      )
    ) || ROLE_BLUEPRINTS.general
  );
};

module.exports = {
  ROLE_BLUEPRINTS,
  resolveRoleBlueprint,
};
