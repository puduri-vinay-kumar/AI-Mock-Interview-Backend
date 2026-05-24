const { runTestCases } = require("./testCaseRunner");
const { mockSandboxExecute } = require("./sandboxExecutor");

const supportedLanguages = ["javascript", "python", "cpp", "java"];

const evaluateCode = async ({
  language,
  code,
  testCases = [],
}) => {
  if (!supportedLanguages.includes(language)) {
    const error = new Error("Unsupported coding language");
    error.statusCode = 400;
    throw error;
  }

  const syntaxLikelyValid = /return|function|class|def|public|#include/.test(code || "");
  const sandboxRun = await mockSandboxExecute({ language, code, testCases });
  const testRun = await runTestCases({ language, code, testCases });
  const score = Math.max(
    0,
    Math.min(
      100,
      ((syntaxLikelyValid && sandboxRun.syntaxLikelyValid) ? 35 : 10) +
        (testRun.total ? (testRun.passed / testRun.total) * 50 : 20) +
        Math.max(0, 20 - testRun.executionTimeMs / 20)
    )
  );

  return {
    language,
    syntaxLikelyValid: syntaxLikelyValid && sandboxRun.syntaxLikelyValid,
    score: Number(score.toFixed(2)),
    sandboxRun,
    testRun,
    suggestions: [
      "Add more edge case handling",
      "Explain time and space complexity clearly",
      "Use descriptive variable names and cleaner structure",
    ],
  };
};

module.exports = {
  evaluateCode,
};
