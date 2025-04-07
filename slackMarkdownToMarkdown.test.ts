import { describe, it, expect } from "vitest";
import { slackMarkdownToMarkdown } from "./index";

describe("slackMarkdownToMarkdown", () => {
	describe("Real-world scenarios", () => {
		it("should convert Slack-formatted text to Markdown", () => {
			const input =
				"hello\n\u2022 hii\n\u2022 foo\n\u2022 bartr\nlist:\n1. one\n2. two\n3. three\n&gt; heyyy a quote\na full code block\n```yoooo```\na partial `code block` here\n\na *bold* text and _italic_ and ~strikethrough~\n\nand here is <https://example.com|a link>";
			const expected =
				"hello\n* hii\n* foo\n* bartr\n\nlist:\n1. one\n2. two\n3. three\n\n> heyyy a quote\n\na full code block\n```\nyoooo\n```\na partial `code block` here\n\na **bold** text and _italic_ and ~~strikethrough~~\n\nand here is [a link](https://example.com)";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Test for nested bullet points with various Unicode symbols
		it("should handle nested bullet points with various unicode symbols", () => {
			const input =
				"testing:\n\u2022 with\n    \u25e6 nested\n    \u25e6 bullets\n        \u25aa\ufe0e here\n        \u25aa\ufe0e and here\nwhat if I continue?";
			const expected =
				"testing:\n* with\n    * nested\n    * bullets\n        * here\n        * and here\n\nwhat if I continue?";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle nested ordered lists", () => {
			const input =
				"testing:\n1. with ordered\n2. bullet\n    a. here\n    b. and here\n        i. and now\n        ii. and this\nok now what if i continue?\n```code blooock!!!```";
			const expected =
				"testing:\n1. with ordered\n2. bullet\n    a. here\n    b. and here\n        i. and now\n        ii. and this\n\nok now what if i continue?\n```\ncode blooock!!!\n```";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});
	});

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

	describe("Bullet Lists", () => {
		// Basic Conversion
		it("should transform bullet character to markdown bullet point", () => {
			const input = "\u2022 Item 1\n\u2022 Item 2\n\u2022 Item 3";
			const expected = "* Item 1\n* Item 2\n* Item 3";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should maintain asterisk-based bullet list markers", () => {
			const input = "* Item 1\n* Item 2\n* Item 3";
			const expected = "* Item 1\n* Item 2\n* Item 3";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Newline Behavior
		it("should add extra newlines when bullet list is followed by content", () => {
			const input =
				"\u2022 Item 1\n\u2022 Item 2\n\u2022 Item 3\nNormal text after";
			const expected = "* Item 1\n* Item 2\n* Item 3\n\nNormal text after";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should not add extra newlines when bullet list is the last thing in input", () => {
			const input = "\u2022 Item 1\n\u2022 Item 2\n\u2022 Item 3";
			const expected = "* Item 1\n* Item 2\n* Item 3";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should not add extra newlines if already present", () => {
			const input =
				"\u2022 Item 1\n\u2022 Item 2\n\u2022 Item 3\n\nNormal text";
			const expected = "* Item 1\n* Item 2\n* Item 3\n\nNormal text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Formatting
		it("should handle bold text inside bullet list items", () => {
			const input = "\u2022 Item with *bold* text";
			const expected = "* Item with **bold** text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle italic text inside bullet list items", () => {
			const input = "\u2022 Item with _italic_ text";
			const expected = "* Item with _italic_ text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle strikethrough text inside bullet list items", () => {
			const input = "\u2022 Item with ~strikethrough~ text";
			const expected = "* Item with ~~strikethrough~~ text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle inline code inside bullet list items", () => {
			const input = "\u2022 Item with `code` text";
			const expected = "* Item with `code` text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Special Elements
		it("should handle links inside bullet list items", () => {
			const input = "\u2022 Item with <https://example.com|link>";
			const expected = "* Item with [link](https://example.com)";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle HTML entities inside bullet list items", () => {
			const input = "\u2022 Item with &lt; symbol and &gt; symbol";
			const expected = "* Item with < symbol and > symbol";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Edge Cases
		it("should handle mixed bullet markers in the same list", () => {
			const input = "\u2022 Item 1\n* Item 2\n\u2022 Item 3";
			const expected = "* Item 1\n* Item 2\n* Item 3";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});
	});

	describe("Ordered Lists", () => {
		// Basic Conversion
		it("should maintain ordered list markers", () => {
			const input = "1. Item 1\n2. Item 2\n3. Item 3";
			const expected = "1. Item 1\n2. Item 2\n3. Item 3";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle multi-digit list markers and add newlines after list", () => {
			const input = "9. Item 9\n10. Item 10\n11. Item 11\nText after list";
			const expected = "9. Item 9\n10. Item 10\n11. Item 11\n\nText after list";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Newline Behavior
		it("should add extra newlines when ordered list is followed by content", () => {
			const input = "1. Item 1\n2. Item 2\n3. Item 3\nNormal text after";
			const expected = "1. Item 1\n2. Item 2\n3. Item 3\n\nNormal text after";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should not add extra newlines when ordered list is the last thing in input", () => {
			const input = "1. Item 1\n2. Item 2\n3. Item 3";
			const expected = "1. Item 1\n2. Item 2\n3. Item 3";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should not add extra newlines if already present", () => {
			const input = "1. Item 1\n2. Item 2\n3. Item 3\n\nNormal text";
			const expected = "1. Item 1\n2. Item 2\n3. Item 3\n\nNormal text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Formatting
		it("should handle bold text inside ordered list items", () => {
			const input = "1. Item with *bold* text";
			const expected = "1. Item with **bold** text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle italic text inside ordered list items", () => {
			const input = "1. Item with _italic_ text";
			const expected = "1. Item with _italic_ text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle strikethrough text inside ordered list items", () => {
			const input = "1. Item with ~strikethrough~ text";
			const expected = "1. Item with ~~strikethrough~~ text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle inline code inside ordered list items", () => {
			const input = "1. Item with `code` text";
			const expected = "1. Item with `code` text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Special Elements
		it("should handle links inside ordered list items", () => {
			const input = "1. Item with <https://example.com|link>";
			const expected = "1. Item with [link](https://example.com)";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle HTML entities inside ordered list items", () => {
			const input = "1. Item with &lt; symbol and &gt; symbol";
			const expected = "1. Item with < symbol and > symbol";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Edge Cases
		it("should handle non-sequential numbers in ordered lists", () => {
			const input =
				"1. Item one\n3. Item three\n7. Item seven\nText after list";
			const expected =
				"1. Item one\n3. Item three\n7. Item seven\n\nText after list";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});
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
	it("should add newlines around code blocks", () => {
		const input = "```const x = 10;```";
		const expected = "```\nconst x = 10;\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle backticks inside code blocks", () => {
		const input = "```inline code with `backticks` inside```";
		const expected = "```\ninline code with `backticks` inside\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle HTML entities inside code blocks", () => {
		const input =
			"```if (x &lt; 10 &amp;&amp; y &gt; 20) { /* do something */ }```";
		const expected = "```\nif (x < 10 && y > 20) { /* do something */ }\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle multiline code blocks", () => {
		const input = "```\nfunction test() {\n  return true;\n}\n```";
		const expected = "```\nfunction test() {\n  return true;\n}\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should not convert bold formatting inside a code block", () => {
		const input =
			"```\nThis is some code with *asterisks* that should not be converted to bold\nconst message = 'Using *asterisks* for emphasis in comments';\n```";
		const expected =
			"```\nThis is some code with *asterisks* that should not be converted to bold\nconst message = 'Using *asterisks* for emphasis in comments';\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should not convert italic formatting inside a code block", () => {
		const input =
			"```\nconsole.log('Hello');\n// _This is a comment with underscores_\nlet var_name_with_underscores = 'value';\n```";
		const expected =
			"```\nconsole.log('Hello');\n// _This is a comment with underscores_\nlet var_name_with_underscores = 'value';\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should not convert strikethrough formatting inside a code block", () => {
		const input =
			"```\n// Documentation for deprecated functions that will be ~removed~ soon\nfunction legacyFunction() ~deprecated~ {\n  // Implementation\n}\n```";
		const expected =
			"```\n// Documentation for deprecated functions that will be ~removed~ soon\nfunction legacyFunction() ~deprecated~ {\n  // Implementation\n}\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle a large code block with mixed formatting patterns", () => {
		const input =
			"```\n/*\n * This large comment block has examples of:\n * *bold text* that should stay as single asterisks\n * _italic text_ that should stay as single underscores\n * ~strikethrough~ that should stay as single tildes\n */\n\nconst config = {\n  formatting: {\n    bold: '*use asterisks*',\n    italic: '_use underscores_',\n    strike: '~use tildes~',\n    code: '`use backticks`'\n  },\n  examples: [\n    '*not bold*',\n    '_not italic_',\n    '~not strikethrough~'\n  ]\n};\n```";
		const expected =
			"```\n/*\n * This large comment block has examples of:\n * *bold text* that should stay as single asterisks\n * _italic text_ that should stay as single underscores\n * ~strikethrough~ that should stay as single tildes\n */\n\nconst config = {\n  formatting: {\n    bold: '*use asterisks*',\n    italic: '_use underscores_',\n    strike: '~use tildes~',\n    code: '`use backticks`'\n  },\n  examples: [\n    '*not bold*',\n    '_not italic_',\n    '~not strikethrough~'\n  ]\n};\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle a code block with HTML entities and formatting characters", () => {
		const input =
			"```\n// Complex expression with HTML entities and formatting chars\nif (x &lt; 10 &amp;&amp; y &gt; 20 *importance*) {\n  return _value_ ~obsolete~;\n}\n\n// Using backticks inside code block\nconst template = `Value is ${x &lt; 10 ? '*low*' : '_high_'}`;\n```";
		const expected =
			"```\n// Complex expression with HTML entities and formatting chars\nif (x < 10 && y > 20 *importance*) {\n  return _value_ ~obsolete~;\n}\n\n// Using backticks inside code block\nconst template = `Value is ${x < 10 ? '*low*' : '_high_'}`;\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	// Test cases for adding newlines around code blocks when they're missing
	it("should add a newline after opening code block if missing", () => {
		const input = "```const x = 10;```";
		const expected = "```\nconst x = 10;\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should add a newline before closing code block if missing", () => {
		const input = "```\nconst x = 10;```";
		const expected = "```\nconst x = 10;\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should add newlines on both sides of code block if missing", () => {
		const input = "```const x = 10;```";
		const expected = "```\nconst x = 10;\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should not add extra newlines if they are already present", () => {
		const input = "```\nconst x = 10;\n```";
		const expected = "```\nconst x = 10;\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	// Link tests
	it("should convert a simple link", () => {
		const input = "<https://example.com>";
		const expected = "[https://example.com](https://example.com)";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert a link with display text", () => {
		const input = "<https://example.com|Example Website>";
		const expected = "[Example Website](https://example.com)";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert multiple links in text", () => {
		const input =
			"Check out <https://example.com> and also <https://another.com|Another Site>";
		const expected =
			"Check out [https://example.com](https://example.com) and also [Another Site](https://another.com)";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert links with surrounding text formatting", () => {
		const input = "*Check out <https://example.com>*";
		const expected = "**Check out [https://example.com](https://example.com)**";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should convert links inside code blocks", () => {
		const input = "```\nVisit <https://example.com> for documentation\n```";
		const expected =
			"```\nVisit [https://example.com](https://example.com) for documentation\n```";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle links with complex URLs", () => {
		const input = "<https://example.com/path?param=value&other=123>";
		const expected =
			"[https://example.com/path?param=value&other=123](https://example.com/path?param=value&other=123)";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	it("should handle links with complex display text", () => {
		const input = "<https://example.com|Visit *Example* Site>";
		const expected = "[Visit *Example* Site](https://example.com)";
		expect(slackMarkdownToMarkdown(input)).toBe(expected);
	});

	// Blockquote tests
	describe("Blockquotes", () => {
		// Basic blockquote functionality
		it("should convert a simple blockquote and add newlines when followed by content", () => {
			const input = "> This is a blockquote\nSome text after";
			const expected = "> This is a blockquote\n\nSome text after";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle multiline blockquotes and add newlines when followed by content", () => {
			const input = "> Line 1\n> Line 2\n> Line 3\nSome text after";
			const expected = "> Line 1\n> Line 2\n> Line 3\n\nSome text after";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should not add extra newlines when blockquote is the last thing in input", () => {
			const input = "> This is a blockquote at the end";
			const expected = "> This is a blockquote at the end";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should not add extra newlines if already present", () => {
			const input = "> This is a blockquote\n\nNormal text";
			const expected = "> This is a blockquote\n\nNormal text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Formatting within blockquotes
		it("should handle bold text within blockquote", () => {
			const input = "> This has *bold* text\nNext line";
			const expected = "> This has **bold** text\n\nNext line";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle italic text within blockquote", () => {
			const input = "> This has _italic_ text\nNext line";
			const expected = "> This has _italic_ text\n\nNext line";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle strikethrough within blockquote", () => {
			const input = "> This has ~strikethrough~ text\nNext line";
			const expected = "> This has ~~strikethrough~~ text\n\nNext line";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle inline code in blockquotes", () => {
			const input = "> Use the `console.log()` function\nNext line";
			const expected = "> Use the `console.log()` function\n\nNext line";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle mixed formatting in blockquotes", () => {
			const input =
				"> This has *bold* and _italic_ and ~strikethrough~ text\nNext line";
			const expected =
				"> This has **bold** and _italic_ and ~~strikethrough~~ text\n\nNext line";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Other elements within blockquotes
		it("should handle links within blockquote", () => {
			const input = "> Check out <https://example.com>\nNext line";
			const expected =
				"> Check out [https://example.com](https://example.com)\n\nNext line";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle links with display text in blockquotes", () => {
			const input = "> Check out <https://example.com|Example Site>\nNext line";
			const expected =
				"> Check out [Example Site](https://example.com)\n\nNext line";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle HTML entities in blockquotes", () => {
			const input =
				"> This is &lt; than that and this is &gt; than this\nNext line";
			const expected =
				"> This is < than that and this is > than this\n\nNext line";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should handle bullet points in blockquotes", () => {
			const input = "> \u2022 Item 1\n> \u2022 Item 2\nNext line";
			const expected = "> * Item 1\n> * Item 2\n\nNext line";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Edge cases
		it("should handle blockquote followed immediately by another blockquote", () => {
			const input = "> First blockquote\n\n> Second blockquote\nSome text";
			const expected = "> First blockquote\n\n> Second blockquote\n\nSome text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should not treat > in the middle of text as a blockquote", () => {
			const input = "This is greater than > symbol in text";
			const expected = "This is greater than > symbol in text";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		it("should not start blockquote state when > appears in code block", () => {
			const input = "```\nif (x > 10) {\n  return true;\n}\n```";
			const expected = "```\nif (x > 10) {\n  return true;\n}\n```";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});

		// Complex combinations
		it("should handle blockquotes with formatted text containing special characters", () => {
			const input =
				"> *Bold text with > symbol*\n> _Italic with < symbol_\nNext line";
			const expected =
				"> **Bold text with > symbol**\n> _Italic with < symbol_\n\nNext line";
			expect(slackMarkdownToMarkdown(input)).toBe(expected);
		});
		describe("HTML-encoded blockquotes", () => {
			it("should convert &gt; at the beginning of a line to a blockquote", () => {
				const input = "&gt; This is a blockquote using HTML entity";
				const expected = "> This is a blockquote using HTML entity";
				expect(slackMarkdownToMarkdown(input)).toBe(expected);
			});

			it("should convert &gt; at the beginning of a line to a blockquote and add newlines when followed by content", () => {
				const input = "&gt; Blockquote with HTML entity\nText after";
				const expected = "> Blockquote with HTML entity\n\nText after";
				expect(slackMarkdownToMarkdown(input)).toBe(expected);
			});

			it("should handle multiple lines of blockquotes with HTML entities", () => {
				const input = "&gt; Line 1\n&gt; Line 2\n&gt; Line 3";
				const expected = "> Line 1\n> Line 2\n> Line 3";
				expect(slackMarkdownToMarkdown(input)).toBe(expected);
			});

			it("should handle formatting inside blockquotes with HTML entities", () => {
				const input = "&gt; Text with *bold* and _italic_ and ~strikethrough~";
				const expected =
					"> Text with **bold** and _italic_ and ~~strikethrough~~";
				expect(slackMarkdownToMarkdown(input)).toBe(expected);
			});

			it("should handle links inside blockquotes with HTML entities", () => {
				const input = "&gt; Check out <https://example.com|Example Site>";
				const expected = "> Check out [Example Site](https://example.com)";
				expect(slackMarkdownToMarkdown(input)).toBe(expected);
			});

			it("should handle mixed standard blockquotes and HTML entity blockquotes", () => {
				const input = "> Standard blockquote\n&gt; HTML entity blockquote";
				const expected = "> Standard blockquote\n> HTML entity blockquote";
				expect(slackMarkdownToMarkdown(input)).toBe(expected);
			});
		});
	});
});
