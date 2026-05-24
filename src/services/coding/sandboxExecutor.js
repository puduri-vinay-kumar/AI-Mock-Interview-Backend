const mockSandboxExecute = async ({ language, code, testCases = [] }) => {
  const normalized = String(code || "");
  const containsCoreConstruct =
    /return|function|class|def|#include|public static void main/.test(normalized);

  return {
    language,
    engine: "mock-sandbox",
    syntaxLikelyValid: containsCoreConstruct,
    executionTimeMs: Math.min(300, Math.max(15, normalized.length)),
    memoryKb: Math.min(1024, 128 + normalized.length * 2),
    stdout: containsCoreConstruct ? "mock execution success" : "",
    stderr: containsCoreConstruct ? "" : "mock execution could not validate syntax",
    passedCount: containsCoreConstruct ? testCases.length : 0,
  };
};

module.exports = {
  mockSandboxExecute,
};
