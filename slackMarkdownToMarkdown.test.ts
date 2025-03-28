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

	it("should convert HTML entity &gt; to > symbol", () => {
		const input = "This is &gt; than that";
		const expected = "This is > than that";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert HTML entity &gt; within formatted text", () => {
		const input = "*This is &gt; than that*";
		const expected = "**This is > than that**";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert HTML entity &lt; to < symbol", () => {
		const input = "This is &lt; than that";
		const expected = "This is < than that";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert HTML entity &amp; to & symbol", () => {
		const input = "This is an &amp; ampersand";
		const expected = "This is an & ampersand";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert HTML entity &lt; within formatted text", () => {
		const input = "*This is &lt; than that*";
		const expected = "**This is < than that**";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	// HTML entity conversion in different formatting states
	it("should convert HTML entities in italic text", () => {
		const input = "_This is &lt; than that and &gt; than this_";
		const expected = "_This is < than that and > than this_";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert HTML entities in strikethrough text", () => {
		const input = "~This is &lt; than that and &gt; than this~";
		const expected = "~~This is < than that and > than this~~";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle HTML entities at the start of formatted text", () => {
		const input = "*&lt;start&gt; of the text*";
		const expected = "**<start> of the text**";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle HTML entities at the end of formatted text", () => {
		const input = "*end of the text &lt;here&gt;*";
		const expected = "**end of the text <here>**";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle multiple HTML entities in a single formatted text", () => {
		const input = "*&lt;tag&gt;content&lt;/tag&gt;*";
		const expected = "**<tag>content</tag>**";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert HTML entities in inline code", () => {
		const input = "`const x = array[0] &lt; 10 &amp;&amp; array[0] &gt; 0;`";
		const expected = "`const x = array[0] < 10 && array[0] > 0;`";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert multiple consecutive &amp; entities", () => {
		const input = "Logical AND: &amp;&amp;";
		const expected = "Logical AND: &&";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	// Code block tests
	it("should preserve code blocks", () => {
		const input = "```const x = 10;```";
		const expected = "```const x = 10;```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle backticks inside code blocks", () => {
		const input = "```inline code with `backticks` inside```";
		const expected = "```inline code with `backticks` inside```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle HTML entities inside code blocks", () => {
		const input = "```if (x &lt; 10 &amp;&amp; y &gt; 20) { /* do something */ }```";
		const expected = "```if (x < 10 && y > 20) { /* do something */ }```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle multiline code blocks", () => {
		const input = "```\nfunction test() {\n  return true;\n}\n```";
		const expected = "```\nfunction test() {\n  return true;\n}\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should not convert bold formatting inside a code block", () => {
		const input = "```\nThis is some code with *asterisks* that should not be converted to bold\nconst message = 'Using *asterisks* for emphasis in comments';\n```";
		const expected = "```\nThis is some code with *asterisks* that should not be converted to bold\nconst message = 'Using *asterisks* for emphasis in comments';\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should not convert italic formatting inside a code block", () => {
		const input = "```\nconsole.log('Hello');\n// _This is a comment with underscores_\nlet var_name_with_underscores = 'value';\n```";
		const expected = "```\nconsole.log('Hello');\n// _This is a comment with underscores_\nlet var_name_with_underscores = 'value';\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should not convert strikethrough formatting inside a code block", () => {
		const input = "```\n// Documentation for deprecated functions that will be ~removed~ soon\nfunction legacyFunction() ~deprecated~ {\n  // Implementation\n}\n```";
		const expected = "```\n// Documentation for deprecated functions that will be ~removed~ soon\nfunction legacyFunction() ~deprecated~ {\n  // Implementation\n}\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle a large code block with mixed formatting patterns", () => {
		const input = "```\n/*\n * This large comment block has examples of:\n * *bold text* that should stay as single asterisks\n * _italic text_ that should stay as single underscores\n * ~strikethrough~ that should stay as single tildes\n */\n\nconst config = {\n  formatting: {\n    bold: '*use asterisks*',\n    italic: '_use underscores_',\n    strike: '~use tildes~',\n    code: '`use backticks`'\n  },\n  examples: [\n    '*not bold*',\n    '_not italic_',\n    '~not strikethrough~'\n  ]\n};\n```";
		const expected = "```\n/*\n * This large comment block has examples of:\n * *bold text* that should stay as single asterisks\n * _italic text_ that should stay as single underscores\n * ~strikethrough~ that should stay as single tildes\n */\n\nconst config = {\n  formatting: {\n    bold: '*use asterisks*',\n    italic: '_use underscores_',\n    strike: '~use tildes~',\n    code: '`use backticks`'\n  },\n  examples: [\n    '*not bold*',\n    '_not italic_',\n    '~not strikethrough~'\n  ]\n};\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle a code block with HTML entities and formatting characters", () => {
		const input = "```\n// Complex expression with HTML entities and formatting chars\nif (x &lt; 10 &amp;&amp; y &gt; 20 *importance*) {\n  return _value_ ~obsolete~;\n}\n\n// Using backticks inside code block\nconst template = `Value is ${x &lt; 10 ? '*low*' : '_high_'}`;\n```";
		const expected = "```\n// Complex expression with HTML entities and formatting chars\nif (x < 10 && y > 20 *importance*) {\n  return _value_ ~obsolete~;\n}\n\n// Using backticks inside code block\nconst template = `Value is ${x < 10 ? '*low*' : '_high_'}`;\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});
});
