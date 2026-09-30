export const EMAIL_REGEX =
	/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

export const PHONE_REGEX =
	/(\+91[\-\s]?)?[0]?(91)?[789]\d{9}/;

export const EXPERIENCE_REGEX =
	/\b(\d+(?:\.\d+)?)\s*\+?\s*(years|yrs)\b/i;

export function extractExperienceYears(text: string): number | null {
	const match = EXPERIENCE_REGEX.exec(text);
	return match ? Number(match[1]) : null;
}