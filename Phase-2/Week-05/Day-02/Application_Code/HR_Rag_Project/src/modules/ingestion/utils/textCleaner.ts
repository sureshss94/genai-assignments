const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function cleanText(rawText: string): string {
	return rawText
		.replace(/\r\n?/g, "\n")
		.replace(controlCharacters, " ")
		.split("\n")
		.map((line) => line.replace(/[^\S\n]+/g, " ").trim())
		.join("\n")
		.replace(/\n{2,}/g, "\n")
		.trim();
}