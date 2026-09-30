import { AlgorithmResumeParser } from "./AlgorithmResumeParser";

describe("AlgorithmResumeParser", () => {
  const parser = new AlgorithmResumeParser();

  test("extracts supported resume fields and skills", () => {
    const result = parser.parseResume(
      [
        "Rajesh Mohan Kumar",
        "Test Architect & Senior Agentic Test Engineer",
        "rajesh@example.com",
        "+91 9876543210",
        "Testleaf Software Solutions Private Limited",
        "B.Tech - Information Technology",
        "13+ years of experience",
        "Selenium WebDriver, Core Java, C#, Python, REST Assured, Postman, RAG, DeepEval, MCP (Model Context Protocol)"
      ].join("\n")
    );

    expect(result).toMatchObject({
      name: "Rajesh Mohan Kumar",
      email: "rajesh@example.com",
      phone: "+91 9876543210",
      company: "Testleaf Software Solutions Private Limited",
      role: "Test Architect & Senior Agentic Test Engineer",
      education: "B.Tech - Information Technology",
      totalExperience: 13,
      skills: [
        "Selenium WebDriver",
        "Core Java",
        "C#",
        "Python",
        "REST Assured",
        "Postman",
        "RAG",
        "DeepEval",
        "MCP (Model Context Protocol)"
      ]
    });
  });

  test("omits fields that are not supported by the input", () => {
    expect(parser.parseResume("Professional profile\nExperienced in leadership."))
      .toEqual({ skills: [] });
  });
});