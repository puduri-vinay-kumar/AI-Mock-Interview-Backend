const runTestCases = async ({ language, code, testCases = [] }) => {
  const executionTimeMs = Math.min(250, Math.max(20, Math.round((code?.length || 0) * 0.8)));
  const passed = testCases.filter((testCase) =>
    String(code || "").toLowerCase().includes(String(testCase.expected || "").toLowerCase())
  ).length;

  return {
    language,
    total: testCases.length,
    passed,
    failed: Math.max(0, testCases.length - passed),
    executionTimeMs,
    outputs: testCases.map((testCase, index) => ({
      caseId: index + 1,
      input: testCase.input,
      expected: testCase.expected,
      actual: passed > index ? testCase.expected : "mock-output",
      passed: passed > index,
    })),
  };
};

module.exports = {
  runTestCases,
};
