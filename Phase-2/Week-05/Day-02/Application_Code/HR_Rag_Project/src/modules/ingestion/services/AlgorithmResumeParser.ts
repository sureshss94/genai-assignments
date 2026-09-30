import { detectSkills } from "../config/skills";
import {
	EMAIL_REGEX,
	extractExperienceYears,
	PHONE_REGEX
} from "../utils/regex";
import { ParsedResume } from "../types/ingestion.types";

const rolePattern =
	/\b(architect|engineer|developer|programmer|manager|lead|director|consultant|analyst|designer|administrator|specialist|tester|qa|product owner)\b/i;
const companyPattern =
	/\b(pvt\.?\s*ltd\.?|private limited|limited|incorporated?|llc|corp(?:oration)?|technologies|solutions)\b/i;
const educationPattern =
	/\b(B\.?\s?Tech|B\.?\s?E\.?|B\.?\s?Sc\.?|M\.?\s?Tech|M\.?\s?E\.?|M\.?\s?Sc\.?|MBA|Ph\.?D\.?|Bachelor(?:'s)?|Master(?:'s)?|Diploma)\b/i;
const namePattern =
	/^(?:\p{Lu}[\p{L}'’-]*)(?:\s+\p{Lu}[\p{L}'’-]*){1,3}$/u;
const roleWords =
	/\b(architect|engineer|developer|programmer|manager|lead|director|consultant|analyst|designer|administrator|specialist|tester|qa|product owner)\b/i;

function getLabeledValue(rawText: string, labels: string): string | undefined {
	const match = new RegExp(`^\\s*(?:${labels})\\s*[:\\-]\\s*(.+)$`, "im").exec(
		rawText
	);
	return match?.[1].trim() || undefined;
}

function getName(rawText: string, lines: string[]): string | undefined {
	const labeledName = getLabeledValue(rawText, "name");
	if (labeledName) {
		return labeledName;
	}

	return lines.slice(0, 8).find((line) => {
		return (
			namePattern.test(line) &&
			!EMAIL_REGEX.test(line) &&
			!roleWords.test(line) &&
			detectSkills(line).length === 0
		);
	});
}

function getRole(rawText: string, lines: string[]): string | undefined {
	const labeledRole = getLabeledValue(rawText, "(?:current\\s+)?(?:role|title|designation)");
	if (labeledRole) {
		return labeledRole;
	}

	return lines.slice(0, 8).find((line) => line.length <= 120 && rolePattern.test(line));
}

function getCompany(rawText: string, lines: string[]): string | undefined {
	const labeledCompany = getLabeledValue(
		rawText,
		"(?:current\\s+)?(?:company|employer|organization|organisation)"
	);
	if (labeledCompany) {
		return labeledCompany;
	}

	return lines.find((line) => companyPattern.test(line));
}

function getEducation(rawText: string, lines: string[]): string | undefined {
	const labeledEducation = getLabeledValue(rawText, "(?:education|degree)");
	if (labeledEducation) {
		return labeledEducation;
	}

	return lines.find((line) => educationPattern.test(line));
}

function getSkills(rawText: string): string[] {
	const normalizedText = rawText.toLowerCase();

	return detectSkills(rawText)
		.map((skill) => {
			if (skill === "Selenium" && /\bselenium\s+webdriver\b/i.test(rawText)) {
				return "Selenium WebDriver";
			}
			if (skill === "Java" && /\bcore\s+java\b/i.test(rawText)) {
				return "Core Java";
			}
			return skill;
		})
		.sort((first, second) => {
			return normalizedText.indexOf(first.toLowerCase()) - normalizedText.indexOf(second.toLowerCase());
		});
}

export class AlgorithmResumeParser {
	parseResume(rawText: string): ParsedResume {
		const lines = rawText
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);
		const resume: ParsedResume = { skills: getSkills(rawText) };
		const name = getName(rawText, lines);
		const email = EMAIL_REGEX.exec(rawText)?.[0];
		const phone = PHONE_REGEX.exec(rawText)?.[0];
		const location = getLabeledValue(rawText, "(?:location|address|city)");
		const company = getCompany(rawText, lines);
		const role = getRole(rawText, lines);
		const education = getEducation(rawText, lines);
		const totalExperience = extractExperienceYears(rawText);

		if (name) resume.name = name;
		if (email) resume.email = email;
		if (phone) resume.phone = phone.trim();
		if (location) resume.location = location;
		if (company) resume.company = company;
		if (role) resume.role = role;
		if (education) resume.education = education;
		if (totalExperience !== null) resume.totalExperience = totalExperience;

		return resume;
	}
}