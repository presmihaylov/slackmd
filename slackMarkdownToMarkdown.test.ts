import { describe, it, expect } from "vitest";
import { slackMarkdownToMarkdown } from "./index";

describe("slackMarkdownToMarkdown", () => {
	it("should return plain text as-is", () => {
		const input = "This is a plain text string with no markdown";
		expect(slackMarkdownToMarkdown(input)).toBe(input);
	});

	// Basic formatting tests
	it("should convert Slack bold to Markdown bold", () => {
		const input = "This *text* is bold";
		const expected = "This **text** is bold";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert Slack italic to Markdown italic", () => {
		const input = "This _text_ is italic";
		const expected = "This _text_ is italic";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert Slack strikethrough to Markdown strikethrough", () => {
		const input = "This ~text~ is strikethrough";
		const expected = "This ~~text~~ is strikethrough";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	// Complex formatting tests
	it("should handle multiple bold sections", () => {
		const input = "This *text* has *multiple* bold parts";
		const expected = "This **text** has **multiple** bold parts";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle mixed formatting", () => {
		const input = "This *bold* and _italic_ and ~strikethrough~ text";
		const expected = "This **bold** and _italic_ and ~~strikethrough~~ text";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle consecutive formatting", () => {
		const input = "This *bold*_italic_~strikethrough~ text";
		const expected = "This **bold**_italic_~~strikethrough~~ text";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle formatting inside words", () => {
		const input = "un*believe*able and im_poss_ible";
		const expected = "un**believe**able and im_poss_ible";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	// Non-formatting cases
	it("should not convert asterisks when not used for formatting", () => {
		const input = "This is an asterisk * symbol";
		expect(slackMarkdownToMarkdown(input)).toBe(input);
	});

	it("should not format text with space after opening asterisk", () => {
		const input = "hey *this * should not be boldened";
		expect(slackMarkdownToMarkdown(input)).toBe(input);
	});

	it("should not format text with space before closing asterisk", () => {
		const input = "hey * this* should not be boldened";
		expect(slackMarkdownToMarkdown(input)).toBe(input);
	});

	it("should not format text with only spaces between format tokens", () => {
		const input = "this * * has spaces";
		expect(slackMarkdownToMarkdown(input)).toBe(input);
	});

	it("should not format unclosed tokens", () => {
		const input = "This *unclosed format";
		expect(slackMarkdownToMarkdown(input)).toBe(input);
	});

	it("should not format with multiple spaces between tokens", () => {
		const input = "This *has  spaces* between";
		const expected = "This **has  spaces** between";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should transform bullet character to markdown bullet point", () => {
		const input = "\u2022 Item 1\n\u2022 Item 2\n\u2022 Item 3";
		const expected = "* Item 1\n* Item 2\n* Item 3";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});
});
