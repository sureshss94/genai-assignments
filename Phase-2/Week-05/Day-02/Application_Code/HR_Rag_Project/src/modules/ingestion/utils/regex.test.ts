import {
  EMAIL_REGEX,
  EXPERIENCE_REGEX,
  extractExperienceYears,
  PHONE_REGEX
} from "./regex";

describe("resume regex utilities", () => {
  test("matches email addresses", () => {
    expect("Contact arun.raj@example.com for details".match(EMAIL_REGEX)?.[0]).toBe(
      "arun.raj@example.com"
    );
  });

  test("matches Indian phone numbers", () => {
    expect("Call +91 9876543210".match(PHONE_REGEX)?.[0]).toBe("+91 9876543210");
  });

  test("extracts numeric years from plus-formatted experience", () => {
    expect(extractExperienceYears("13+ years of experience")).toBe(13);
  });

  test("extracts decimal years and supports the yrs abbreviation", () => {
    expect(extractExperienceYears("4.5 yrs experience")).toBe(4.5);
  });

  test("returns null when experience is not present", () => {
    expect(extractExperienceYears("Experienced test architect")).toBeNull();
    expect(EXPERIENCE_REGEX.test("Experienced test architect")).toBe(false);
  });
});