# @presmihaylov/slackmd

A lightweight utility to convert Slack markdown to standard markdown.

[![npm version](https://img.shields.io/npm/v/@presmihaylov/slackmd.svg)](https://www.npmjs.com/package/@presmihaylov/slackmd)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @presmihaylov/slackmd
# or
yarn add @presmihaylov/slackmd
# or
bun add @presmihaylov/slackmd
```

## Usage

```typescript
import { slackMarkdownToMarkdown } from '@presmihaylov/slackmd';

// Basic usage
const slackText = "Hello *bold* text and _italic_ with <https://example.com|a link>";
const standardMarkdown = slackMarkdownToMarkdown(slackText);
console.log(standardMarkdown);
// Output: "Hello **bold** text and _italic_ with [a link](https://example.com)"
```

## Features

- Converts Slack-style bold (`*bold*`) to markdown bold (`**bold**`)
- Converts Slack-style italic (`_italic_`) to markdown italic (`*italic*`)
- Converts Slack-style strikethrough (`~strike~`) to markdown strikethrough (`~~strike~~`)
- Converts Slack-style code blocks (both inline and multiline)
- Converts Slack-style links (`<https://example.com|text>`) to markdown links (`[text](https://example.com)`)
- Handles bullet points and numbered lists
- Handles blockquotes
- Graceful error recovery for malformed input

## API

### slackMarkdownToMarkdown(text, logLevel)

Converts Slack markdown to standard markdown format.

**Parameters:**
- `text` (string): The Slack markdown text to convert
- `logLevel` (LogLevel, optional): The level of logging. Defaults to LogLevel.OFF

**Returns:**
- Standard markdown formatted text (string)

## License

MIT © [presmihaylov](https://github.com/presmihaylov)
