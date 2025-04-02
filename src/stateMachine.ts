export type StateKey =
	| "TEXT"
	| "BOLD"
	| "ITALIC"
	| "STRIKETHROUGH"
	| "INLINE_CODE"
	| "CODE_BLOCK"
	| "BLOCKQUOTE"
	| "BULLET_LIST"
	| "LINK"
	| "SKIP_TOKENS"
	| "END";

export type BasicStateKey = Exclude<StateKey, "SKIP_TOKENS" | "LINK">;

export type BasicStateData = {
	state: BasicStateKey;
	prevState: BasicStateKey;
};

export type LinkStateData = {
	state: "LINK";
	url: string;
	displayText: string | null;
	parsingPhase: "url" | "displayText" | "closing";
	prevState: BasicStateKey;
};

export type SkipTokensStateData = {
	state: "SKIP_TOKENS";
	tokensToSkip: number;
	nextState: BasicStateKey;
	prevState: BasicStateKey;
};

export type StateData = BasicStateData | LinkStateData | SkipTokensStateData;

export type StateMachineInput = {
	previousTokens: string[];
	currentToken: string;
	nextTokens: string[];
};

import { Logger } from "./logger";

export type StateMachine = {
	currentState: StateData;
	result: string;
	log: Logger; // Logger for state machine
};

export type StateHandler = (
	sm: StateMachine,
	input: StateMachineInput,
) => StateMachine;

// Helper function to check if formatting conditions are met
const shouldEnterFormattedText = (
	input: StateMachineInput,
	formatToken: string,
): boolean => {
	// Check if current token is the format token
	if (input.currentToken !== formatToken) return false;

	// Check if there's another format token in next tokens
	const nextIdx = input.nextTokens.findIndex((token) => token === formatToken);
	if (nextIdx === -1) return false;

	// Check if there's a whitespace token immediately after the opening format token
	if (input.nextTokens.length > 0 && /\s/.test(input.nextTokens[0] ?? "")) {
		return false;
	}

	// Check if there's a whitespace token immediately before the closing format token
	if (nextIdx > 0 && /\s/.test(input.nextTokens[nextIdx - 1] ?? "")) {
		return false;
	}

	return true;
};

// Helper function to check for code block start (triple backticks)
const isCodeBlockStart = (input: StateMachineInput): boolean => {
	// Need current token and the next two to be backticks
	if (input.currentToken !== "`") return false;
	if (input.nextTokens.length < 2) return false;
	if (input.nextTokens[0] !== "`" || input.nextTokens[1] !== "`") return false;

	return true;
};

// Helper function to check for a link start (<https://...)
const isLinkStart = (input: StateMachineInput): boolean => {
	// Check if the current token is <
	if (input.currentToken !== "<") return false;

	// Check if the next token starts with http:// or https://
	if (input.nextTokens.length === 0) return false;

	// Look for http or https at the start
	const nextChars = input.nextTokens.slice(0, 8).join("");
	return nextChars.startsWith("http://") || nextChars.startsWith("https://");
};

// Helper function to check if we're at the beginning of a line
const isBeginningOfLine = (input: StateMachineInput): boolean => {
	// True if we're at the start of the input
	if (input.previousTokens.length === 0) return true;
	
	// True if the previous token is a newline
	return input.previousTokens[input.previousTokens.length - 1] === "\n";
};

// Helper function to check for inline code formatting
const isInlineCode = (input: StateMachineInput): boolean => {
	// Check if current token is a backtick but not part of triple backticks
	if (input.currentToken !== "`") return false;
	
	// It's not inline code if it's part of a code block start
	if (input.nextTokens.length >= 2 && 
	    input.nextTokens[0] === "`" && 
	    input.nextTokens[1] === "`") {
		return false;
	}
	
	// Check if there's another backtick in next tokens
	return input.nextTokens.some(token => token === "`");
};

// Helper function to check for bullet list markers
const isBulletListMarker = (input: StateMachineInput): boolean => {
	// Check if we're at the beginning of a line
	if (!isBeginningOfLine(input)) return false;
	
	// Check for bullet character
	if (input.currentToken === "\u2022") return true;
	
	// Check for asterisk bullet (* )
	if (input.currentToken === "*" && 
	    input.nextTokens.length > 0 && 
	    input.nextTokens[0] === " ") {
		return true;
	}
	
	return false;
};

// Helper function to check for ordered list markers (1., 2., etc.)
const isOrderedListMarker = (input: StateMachineInput): boolean => {
	// Check if we're at the beginning of a line
	if (!isBeginningOfLine(input)) return false;
	
	// Check if current token is a digit
	if (!/\d/.test(input.currentToken)) return false;
	
	// Look ahead for a period followed by a space
	// Need at least 2 characters ahead (period and space)
	if (input.nextTokens.length < 2) return false;
	
	// Continue reading digits until we hit non-digit
	let i = 0;
	while (i < input.nextTokens.length && /\d/.test(input.nextTokens[i] || "")) {
		i++;
	}
	
	// Check if the next character after digits is a period followed by space
	return i < input.nextTokens.length - 1 && 
	       (input.nextTokens[i] || "") === "." && 
	       (input.nextTokens[i + 1] || "") === " ";
};

const createFormattedTextStateHandler = (
	stateKey: BasicStateKey,
	formatToken: string,
	times: number,
): StateHandler => {
	return (sm: StateMachine, input: StateMachineInput): StateMachine => {
		if (input.currentToken === formatToken) {
			sm.log.debug(
				`Exiting ${stateKey.toLowerCase()} formatting at position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + formatToken.repeat(times),
				currentState: {
					state:
						input.nextTokens.length > 0 ? sm.currentState.prevState : "END",
					prevState: stateKey,
				},
			};
		}

		// Check for link start, even in formatted text
		if (isLinkStart(input)) {
			// Enter link mode
			sm.log.debug(
				`Detected link inside ${stateKey.toLowerCase()} text at position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				// Don't add the opening < to the result
				currentState: {
					state: "LINK",
					url: "",
					displayText: null,
					parsingPhase: "url",
					prevState: stateKey,
				},
			};
		}

		const specialCharsResult = handleSpecialCharacters(
			sm,
			input,
			stateKey,
			stateKey,
		);
		if (specialCharsResult !== null) {
			return specialCharsResult;
		}

		return {
			...sm,
			result: sm.result + input.currentToken,
			currentState: {
				state: stateKey,
				prevState: sm.currentState.prevState,
			},
		};
	};
};

// Helper function to check if current and next tokens form an HTML entity
const isHtmlEntity = (input: StateMachineInput, entity: string): boolean => {
	if (input.currentToken !== "&") return false;

	// Check if we have enough tokens to form the complete entity
	if (input.nextTokens.length < entity.length - 1) return false;

	// Check if all the following tokens match the entity
	const entityWithoutAmp = entity.substring(1);
	for (let i = 0; i < entityWithoutAmp.length; i++) {
		if (input.nextTokens[i] !== entityWithoutAmp[i]) return false;
	}

	return true;
};

// Helper function to handle special characters (HTML entities)
const handleSpecialCharacters = (
	sm: StateMachine,
	input: StateMachineInput,
	nextState: BasicStateKey,
	prevState: BasicStateKey,
): StateMachine | null => {
	if (isHtmlEntity(input, "&gt;")) {
		// Convert &gt; to >
		sm.log.debug(
			`Converting HTML entity &gt; to > at position ${input.previousTokens.length}`,
		);
		return {
			...sm,
			result: sm.result + ">",
			currentState: {
				state: "SKIP_TOKENS",
				tokensToSkip: 3, // Skip 'g', 't', ';'
				nextState,
				prevState,
			},
		};
	} else if (isHtmlEntity(input, "&lt;")) {
		// Convert &lt; to <
		sm.log.debug(
			`Converting HTML entity &lt; to < at position ${input.previousTokens.length}`,
		);
		return {
			...sm,
			result: sm.result + "<",
			currentState: {
				state: "SKIP_TOKENS",
				tokensToSkip: 3, // Skip 'l', 't', ';'
				nextState,
				prevState,
			},
		};
	} else if (isHtmlEntity(input, "&amp;")) {
		// Convert &amp; to &
		sm.log.debug(
			`Converting HTML entity &amp; to & at position ${input.previousTokens.length}`,
		);
		return {
			...sm,
			result: sm.result + "&",
			currentState: {
				state: "SKIP_TOKENS",
				tokensToSkip: 4, // Skip 'a', 'm', 'p', ';'
				nextState,
				prevState,
			},
		};
	}

	// No special character found
	return null;
};

const states: Record<string, StateHandler> = {
	BULLET_LIST: (sm: StateMachine, input: StateMachineInput): StateMachine => {
		// Check for bullet character within list items
		if (input.currentToken === "\u2022") {
			sm.log.debug(
				`Converting bullet point inside list at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "*",
				currentState: {
					state: "BULLET_LIST",
					prevState: sm.currentState.prevState,
				},
			};
		}
		
		// Check if we've reached a newline (end of the current list item)
		if (input.currentToken === "\n") {
			// Look ahead to check if the next line is another list item
			const isFollowedByListItem = 
				input.nextTokens.length > 0 && 
				(isBulletListMarker({ 
					previousTokens: [...input.previousTokens, input.currentToken], 
					currentToken: input.nextTokens[0] || "", 
					nextTokens: input.nextTokens.slice(1) 
				}) || isOrderedListMarker({ 
					previousTokens: [...input.previousTokens, input.currentToken], 
					currentToken: input.nextTokens[0] || "", 
					nextTokens: input.nextTokens.slice(1) 
				}));
			
			// If the next line isn't a list item, exit the list state and add an extra newline
			if (!isFollowedByListItem) {
				sm.log.debug(
					`Exiting bullet list at token position ${input.previousTokens.length}`,
				);
				
				// Check if we need to add an extra newline for proper markdown spacing
				const hasDoubleNewline = 
					input.nextTokens.length > 0 && 
					input.nextTokens[0] === "\n";
					
				return {
					...sm,
					result: sm.result + "\n" + (hasDoubleNewline || input.nextTokens.length === 0 ? "" : "\n"),
					currentState: {
						state: "TEXT",
						prevState: "BULLET_LIST",
					},
				};
			}
			
			// If the next line is another list item, just add the newline and continue
			return {
				...sm,
				result: sm.result + input.currentToken,
				currentState: {
					state: "BULLET_LIST",
					prevState: sm.currentState.prevState,
				},
			};
		}
		
		// Handle formatted text inside bullet list
		if (isLinkStart(input)) {
			sm.log.debug(
				`Detected link inside bullet list at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				currentState: {
					state: "LINK",
					url: "",
					displayText: null,
					parsingPhase: "url",
					prevState: "BULLET_LIST",
				},
			};
		} else if (shouldEnterFormattedText(input, "*")) {
			sm.log.debug(
				`Entering bold text inside bullet list at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "**",
				currentState: { state: "BOLD", prevState: "BULLET_LIST" },
			};
		} else if (shouldEnterFormattedText(input, "_")) {
			sm.log.debug(
				`Entering italic text inside bullet list at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "_",
				currentState: { state: "ITALIC", prevState: "BULLET_LIST" },
			};
		} else if (shouldEnterFormattedText(input, "~")) {
			sm.log.debug(
				`Entering strikethrough text inside bullet list at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "~~",
				currentState: { state: "STRIKETHROUGH", prevState: "BULLET_LIST" },
			};
		} else if (isInlineCode(input)) {
			sm.log.debug(
				`Entering inline code inside bullet list at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "`",
				currentState: { state: "INLINE_CODE", prevState: "BULLET_LIST" },
			};
		}
		
		// Handle special characters
		const specialCharsResult = handleSpecialCharacters(
			sm,
			input,
			"BULLET_LIST",
			"BULLET_LIST",
		);
		if (specialCharsResult !== null) {
			return specialCharsResult;
		}
		
		// Normal case - just add the character and continue in BULLET_LIST state
		return {
			...sm,
			result: sm.result + input.currentToken,
			currentState: {
				state: "BULLET_LIST", 
				prevState: sm.currentState.prevState,
			},
		};
	},
	
	TEXT: (sm: StateMachine, input: StateMachineInput): StateMachine => {
		// Check for blockquote start if we're at the beginning of a line and the current token is ">"
		if (isBeginningOfLine(input) && input.currentToken === ">") {
			sm.log.debug(
				`Detected blockquote start at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + ">",
				currentState: { state: "BLOCKQUOTE", prevState: "TEXT" },
			};
		} else if (isBulletListMarker(input)) {
			// Enter bullet list mode
			sm.log.debug(
				`Detected bullet list at token position ${input.previousTokens.length}`,
			);
			
			// Handle the bullet character appropriately
			if (input.currentToken === "\u2022") {
				return {
					...sm,
					result: sm.result + "*",
					currentState: { state: "BULLET_LIST", prevState: "TEXT" },
				};
			} else if (input.currentToken === "*") {
				// Add the asterisk and stay in current state to process the space next
				return {
					...sm,
					result: sm.result + "*",
					currentState: { state: "BULLET_LIST", prevState: "TEXT" },
				};
			}
		} else if (isOrderedListMarker(input)) {
			// Enter ordered list mode
			sm.log.debug(
				`Detected ordered list at token position ${input.previousTokens.length}`,
			);
			
			// Add the current digit
			return {
				...sm,
				result: sm.result + input.currentToken,
				currentState: { state: "BULLET_LIST", prevState: "TEXT" },
			};
		} else if (isLinkStart(input)) {
			// Enter link mode
			sm.log.debug(
				`Detected link start at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				// Don't add the opening < to the result
				currentState: {
					state: "LINK",
					url: "",
					displayText: null,
					parsingPhase: "url",
					prevState: "TEXT",
				},
			};
		} else if (isCodeBlockStart(input)) {
			// Enter code block mode (triple backticks)
			sm.log.debug(
				`Detected code block start at token position ${input.previousTokens.length}`,
			);

			// Check if the next token after the triple backticks is a newline
			const hasNewlineAfterOpening =
				input.nextTokens.length > 2 && input.nextTokens[2] === "\n";

			return {
				...sm,
				// Add a newline after the opening ``` if one is not already present
				result: sm.result + "```" + (hasNewlineAfterOpening ? "" : "\n"),
				currentState: {
					state: "SKIP_TOKENS",
					tokensToSkip: 2, // Skip the next two backticks
					nextState: "CODE_BLOCK",
					prevState: "TEXT",
				},
			};
		} else if (shouldEnterFormattedText(input, "*")) {
			sm.log.debug(
				`Entering bold text at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "**",
				currentState: { state: "BOLD", prevState: "TEXT" },
			};
		} else if (shouldEnterFormattedText(input, "_")) {
			sm.log.debug(
				`Entering italic text at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "_",
				currentState: { state: "ITALIC", prevState: "TEXT" },
			};
		} else if (shouldEnterFormattedText(input, "~")) {
			sm.log.debug(
				`Entering strikethrough text at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "~~",
				currentState: { state: "STRIKETHROUGH", prevState: "TEXT" },
			};
		} else if (isInlineCode(input)) {
			sm.log.debug(
				`Entering inline code at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "`",
				currentState: { state: "INLINE_CODE", prevState: "TEXT" },
			};
		} else if (input.currentToken === "\u2022") {
			// bullet point that's not at the beginning of a line (inline bullet)
			sm.log.debug(
				`Converting inline bullet point at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "*",
				currentState: {
					state: input.nextTokens.length > 0 ? "TEXT" : "END",
					prevState:
						input.nextTokens.length > 0 ? sm.currentState.prevState : "TEXT",
				},
			};
		}

		const specialCharsResult = handleSpecialCharacters(
			sm,
			input,
			"TEXT",
			"TEXT",
		);
		if (specialCharsResult !== null) {
			return specialCharsResult;
		}

		return {
			...sm,
			result: sm.result + input.currentToken,
			currentState: {
				state: input.nextTokens.length > 0 ? "TEXT" : "END",
				prevState:
					input.nextTokens.length > 0 ? sm.currentState.prevState : "TEXT",
			},
		};
	},
	BOLD: createFormattedTextStateHandler("BOLD", "*", 2),
	ITALIC: createFormattedTextStateHandler("ITALIC", "_", 1),
	STRIKETHROUGH: createFormattedTextStateHandler("STRIKETHROUGH", "~", 2),
	INLINE_CODE: createFormattedTextStateHandler("INLINE_CODE", "`", 1),
	CODE_BLOCK: (sm: StateMachine, input: StateMachineInput): StateMachine => {
		// Check for code block end (triple backticks)
		if (isCodeBlockStart(input)) {
			// Skip the next two backticks
			sm.log.debug(
				`Detected code block end at token position ${input.previousTokens.length}`,
			);

			// Check if the last character before closing ``` is a newline
			const hasNewlineBeforeClosing =
				input.previousTokens.length > 0 &&
				input.previousTokens[input.previousTokens.length - 1] === "\n";

			return {
				...sm,
				// Add a newline before the closing ``` if one is not already present
				result: sm.result + (hasNewlineBeforeClosing ? "" : "\n") + "```",
				currentState: {
					state: "SKIP_TOKENS",
					tokensToSkip: 2, // Skip the next two backticks
					nextState: "TEXT",
					prevState: "CODE_BLOCK",
				},
			};
		}

		// Check for link start, even in code blocks
		if (isLinkStart(input)) {
			// Enter link mode
			sm.log.debug(
				`Detected link inside code block at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				// Don't add the opening < to the result
				currentState: {
					state: "LINK",
					url: "",
					displayText: null,
					parsingPhase: "url",
					prevState: "CODE_BLOCK",
				},
			};
		}

		// Handle special characters even in code blocks
		const specialCharsResult = handleSpecialCharacters(
			sm,
			input,
			"CODE_BLOCK",
			"CODE_BLOCK",
		);
		if (specialCharsResult !== null) {
			return specialCharsResult;
		}

		// Process content within the code block
		return {
			...sm,
			result: sm.result + input.currentToken,
			currentState: {
				state: "CODE_BLOCK",
				prevState: sm.currentState.prevState,
			},
		};
	},
	LINK: (sm: StateMachine, input: StateMachineInput): StateMachine => {
		if (sm.currentState.state !== "LINK") {
			sm.log.error(`Expected LINK state but got ${sm.currentState.state}`);
			throw new Error("Invalid state");
		}

		const linkData = sm.currentState as LinkStateData;

		// Handle link closing
		if (input.currentToken === ">") {
			const url = linkData.url;
			const displayText = linkData.displayText || url;

			// Format as markdown link: [display](url)
			const markdownLink = `[${displayText}](${url})`;
			sm.log.debug(
				`Completed link at token position ${input.previousTokens.length}: ${markdownLink}`,
			);

			return {
				...sm,
				result: sm.result + markdownLink,
				currentState: {
					state: input.nextTokens.length > 0 ? linkData.prevState : "END",
					prevState: linkData.prevState,
				},
			};
		}

		// Handle separator between URL and display text
		if (input.currentToken === "|" && linkData.parsingPhase === "url") {
			sm.log.debug(
				`Link separator found at token position ${input.previousTokens.length}, switching to display text`,
			);
			return {
				...sm,
				currentState: {
					...linkData,
					displayText: "",
					parsingPhase: "displayText",
				},
			};
		}

		// Accumulate URL characters
		if (linkData.parsingPhase === "url") {
			return {
				...sm,
				currentState: {
					...linkData,
					url: linkData.url + input.currentToken,
				},
			};
		}

		// Accumulate display text characters
		if (linkData.parsingPhase === "displayText") {
			return {
				...sm,
				currentState: {
					...linkData,
					displayText: (linkData.displayText || "") + input.currentToken,
				},
			};
		}

		// Fallback - should not reach here
		sm.log.warn(
			`Unexpected state in LINK handler at token position ${input.previousTokens.length}`,
		);
		return sm;
	},
	END: (sm: StateMachine, _input: StateMachineInput): StateMachine => {
		return sm;
	},
	BLOCKQUOTE: (sm: StateMachine, input: StateMachineInput): StateMachine => {
		// Check if we've reached a newline that's not followed by a ">" character
		if (input.currentToken === "\n") {
			// Look ahead to see if the next non-whitespace token is a ">"
			const isFollowedByBlockquote = 
				input.nextTokens.length > 0 && 
				input.nextTokens[0] === ">";
			
			if (!isFollowedByBlockquote) {
				sm.log.debug(
					`Exiting blockquote at token position ${input.previousTokens.length}`,
				);
				
				// Check if we need to add an extra newline for proper markdown spacing
				const hasDoubleNewline = 
					input.nextTokens.length > 0 && 
					input.nextTokens[0] === "\n";
					
				return {
					...sm,
					result: sm.result + "\n" + (hasDoubleNewline ? "" : "\n"),
					currentState: {
						state: "TEXT",
						prevState: "BLOCKQUOTE",
					},
				};
			}
			
			// If it's a newline followed by ">", just add the newline and continue
			return {
				...sm,
				result: sm.result + input.currentToken,
				currentState: {
					state: "BLOCKQUOTE",
					prevState: sm.currentState.prevState,
				},
			};
		}
		
		// Handle all the special states just like in TEXT mode
		if (isLinkStart(input)) {
			sm.log.debug(
				`Detected link inside blockquote at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				currentState: {
					state: "LINK",
					url: "",
					displayText: null,
					parsingPhase: "url",
					prevState: "BLOCKQUOTE",
				},
			};
		} else if (isCodeBlockStart(input)) {
			sm.log.debug(
				`Detected code block inside blockquote at token position ${input.previousTokens.length}`,
			);
			
			const hasNewlineAfterOpening =
				input.nextTokens.length > 2 && input.nextTokens[2] === "\n";
				
			return {
				...sm,
				result: sm.result + "```" + (hasNewlineAfterOpening ? "" : "\n"),
				currentState: {
					state: "SKIP_TOKENS",
					tokensToSkip: 2,
					nextState: "CODE_BLOCK",
					prevState: "BLOCKQUOTE",
				},
			};
		} else if (shouldEnterFormattedText(input, "*")) {
			sm.log.debug(
				`Entering bold text inside blockquote at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "**",
				currentState: { state: "BOLD", prevState: "BLOCKQUOTE" },
			};
		} else if (shouldEnterFormattedText(input, "_")) {
			sm.log.debug(
				`Entering italic text inside blockquote at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "_",
				currentState: { state: "ITALIC", prevState: "BLOCKQUOTE" },
			};
		} else if (shouldEnterFormattedText(input, "~")) {
			sm.log.debug(
				`Entering strikethrough text inside blockquote at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "~~",
				currentState: { state: "STRIKETHROUGH", prevState: "BLOCKQUOTE" },
			};
		} else if (isInlineCode(input)) {
			sm.log.debug(
				`Entering inline code inside blockquote at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "`",
				currentState: { state: "INLINE_CODE", prevState: "BLOCKQUOTE" },
			};
		} else if (input.currentToken === "\u2022") {
			// bullet point
			sm.log.debug(
				`Converting bullet point inside blockquote at token position ${input.previousTokens.length}`,
			);
			return {
				...sm,
				result: sm.result + "*",
				currentState: {
					state: "BLOCKQUOTE",
					prevState: sm.currentState.prevState,
				},
			};
		}
		
		const specialCharsResult = handleSpecialCharacters(
			sm,
			input,
			"BLOCKQUOTE",
			"BLOCKQUOTE",
		);
		if (specialCharsResult !== null) {
			return specialCharsResult;
		}
		
		// Normal case - just add the character and continue
		return {
			...sm,
			result: sm.result + input.currentToken,
			currentState: {
				state: "BLOCKQUOTE", 
				prevState: sm.currentState.prevState,
			},
		};
	},
	
	SKIP_TOKENS: (sm: StateMachine, _input: StateMachineInput): StateMachine => {
		if (sm.currentState.state !== "SKIP_TOKENS") {
			sm.log.error(
				`Expected SKIP_TOKENS state but got ${sm.currentState.state}`,
			);
			throw new Error("Invalid state");
		}

		const tokensToSkip = sm.currentState.tokensToSkip;
		if (tokensToSkip <= 1) {
			// We've skipped all tokens, return to the previous state
			sm.log.debug(
				`Finished skipping tokens, returning to ${sm.currentState.nextState} state`,
			);
			return {
				...sm,
				currentState: {
					state: sm.currentState.nextState,
					prevState: sm.currentState.prevState,
				},
			};
		}

		// Continue skipping tokens
		sm.log.trace(`Skipping token, ${tokensToSkip - 1} more to skip`);
		return {
			...sm,
			currentState: {
				state: "SKIP_TOKENS",
				tokensToSkip: tokensToSkip - 1,
				nextState: sm.currentState.nextState,
				prevState: sm.currentState.prevState,
			},
		};
	},
};

export const getState = (machine: StateMachine): StateHandler => {
	const state = states[machine.currentState.state];
	if (state === undefined) {
		machine.log.error(`State ${machine.currentState.state} not found`);
		throw new Error(`State ${machine.currentState.state} not found`);
	}

	return state;
};

export const createStateMachine = (log: Logger): StateMachine => {
	return {
		currentState: { state: "TEXT", prevState: "TEXT" },
		result: "",
		log,
	};
};
