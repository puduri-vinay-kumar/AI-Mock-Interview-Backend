const evaluateVerilog = async ({ code, moduleName = "top_module" }) => {
  const hasModule = new RegExp(`module\\s+${moduleName}`, "i").test(code || "");
  const hasEndmodule = /endmodule/i.test(code || "");
  const warnings = [];

  if (!hasModule) {
    warnings.push("Module declaration was not found.");
  }

  if (!hasEndmodule) {
    warnings.push("endmodule keyword is missing.");
  }

  return {
    moduleName,
    syntaxLikelyValid: hasModule && hasEndmodule,
    waveformUrl: "mock://waveform/view",
    simulationSummary:
      hasModule && hasEndmodule
        ? "Mock simulation completed successfully."
        : "Mock simulation failed structural validation.",
    warnings,
    score: hasModule && hasEndmodule ? 76 : 38,
  };
};

module.exports = {
  evaluateVerilog,
};
