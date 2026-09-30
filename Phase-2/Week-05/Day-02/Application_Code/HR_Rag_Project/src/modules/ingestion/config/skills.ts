export const SKILLS = [
  "Java",
  "Selenium",
  "Playwright",
  "API Testing",
  "Postman",
  "SQL",
  "MongoDB",
  "Jenkins",
  "Python",
  "C#",
  "REST Assured",
  "Cucumber",
  "GenAI",
  "Langchain",
  "Langgraph",
  "RAG",
  "Azure DevOps",
  "AWS Lambda",
  "GitHub",
  "DeepEval",
  "MCP (Model Context Protocol)"
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function detectSkills(rawText: string): string[] {
  const normalizedText = rawText.replace(/\s+/g, " ");

  return SKILLS.filter((skill) => {
    const matcher = new RegExp(
      `(^|[^A-Za-z0-9])${escapeRegExp(skill)}(?=$|[^A-Za-z0-9])`,
      "i"
    );
    return matcher.test(normalizedText);
  });
}