export type StateKey =
	| "TEXT"
	| "BOLD"
	| "ITALIC"
	| "STRIKETHROUGH"
	| "INLINE_CODE"
	| "CODE_BLOCK"
	| "LINK"
	| "SKIP_TOKENS"
	| "END";

export type BasicStateKey = Exclude<StateKey, "SKIP_TOKENS" | "LINK">;

export type BasicStateData = {
	state: BasicStateKey;
};

export type LinkStateData = {
	state: "LINK";
	url: string;
	displayText: string | null;
	parsingPhase: "url" | "displayText" | "closing";
	nextState: BasicStateKey; // State to return to after link is complete
};

export type SkipTokensStateData = {
	state: "SKIP_TOKENS";
	tokensToSkip: number;
	nextState: BasicStateKey;
};

export type StateData = BasicStateData | LinkStateData | SkipTokensStateData;

export type StateMachineInput = {
	previousTokens: string[];
	currentToken: string;
	nextTokens: string[];
};

export type StateMachine = {
	currentState: StateData;
	result: string;
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

const createFormattedTextStateHandler = (
	stateKey: BasicStateKey,
	formatToken: string,
	times: number,
): StateHandler => {
	return (sm: StateMachine, input: StateMachineInput): StateMachine => {
		if (input.currentToken === formatToken) {
			return {
				...sm,
				result: sm.result + formatToken.repeat(times),
				currentState: {
					state: input.nextTokens.length > 0 ? "TEXT" : "END",
				},
			};
		}

		// Check for link start, even in formatted text
		if (isLinkStart(input)) {
			// Enter link mode
			return {
				...sm,
				// Don't add the opening < to the result
				currentState: {
					state: "LINK",
					url: "",
					displayText: null,
					parsingPhase: "url",
					nextState: stateKey,
				},
			};
		}

		const specialCharsResult = handleSpecialCharacters(sm, input, stateKey);
		if (specialCharsResult !== null) {
			return specialCharsResult;
		}

		return {
			...sm,
			result: sm.result + input.currentToken,
			currentState: {
				state: stateKey,
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
): StateMachine | null => {
	if (isHtmlEntity(input, "&gt;")) {
		// Convert &gt; to >
		return {
			...sm,
			result: sm.result + ">",
			currentState: {
				state: "SKIP_TOKENS",
				tokensToSkip: 3, // Skip 'g', 't', ';'
				nextState,
			},
		};
	} else if (isHtmlEntity(input, "&lt;")) {
		// Convert &lt; to <
		return {
			...sm,
			result: sm.result + "<",
			currentState: {
				state: "SKIP_TOKENS",
				tokensToSkip: 3, // Skip 'l', 't', ';'
				nextState,
			},
		};
	} else if (isHtmlEntity(input, "&amp;")) {
		// Convert &amp; to &
		return {
			...sm,
			result: sm.result + "&",
			currentState: {
				state: "SKIP_TOKENS",
				tokensToSkip: 4, // Skip 'a', 'm', 'p', ';'
				nextState,
			},
		};
	}

	// No special character found
	return null;
};

const states: Record<string, StateHandler> = {
	TEXT: (sm: StateMachine, input: StateMachineInput): StateMachine => {
		if (isLinkStart(input)) {
			// Enter link mode
			return {
				...sm,
				// Don't add the opening < to the result
				currentState: {
					state: "LINK",
					url: "",
					displayText: null,
					parsingPhase: "url",
					nextState: "TEXT",
				},
			};
		} else if (isCodeBlockStart(input)) {
			// Enter code block mode (triple backticks)
			return {
				...sm,
				result: sm.result + "```",
				currentState: {
					state: "SKIP_TOKENS",
					tokensToSkip: 2, // Skip the next two backticks
					nextState: "CODE_BLOCK",
				},
			};
		} else if (shouldEnterFormattedText(input, "*")) {
			return {
				...sm,
				result: sm.result + "**",
				currentState: { state: "BOLD" },
			};
		} else if (shouldEnterFormattedText(input, "_")) {
			return {
				...sm,
				result: sm.result + "_",
				currentState: { state: "ITALIC" },
			};
		} else if (shouldEnterFormattedText(input, "~")) {
			return {
				...sm,
				result: sm.result + "~~",
				currentState: { state: "STRIKETHROUGH" },
			};
		} else if (input.currentToken === "\u2022") {
			// bullet point
			return {
				...sm,
				result: sm.result + "*",
				currentState: {
					state: input.nextTokens.length > 0 ? "TEXT" : "END",
				},
			};
		}

		const specialCharsResult = handleSpecialCharacters(sm, input, "TEXT");
		if (specialCharsResult !== null) {
			return specialCharsResult;
		}

		return {
			...sm,
			result: sm.result + input.currentToken,
			currentState: {
				state: input.nextTokens.length > 0 ? "TEXT" : "END",
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
			return {
				...sm,
				result: sm.result + "```",
				currentState: {
					state: "SKIP_TOKENS",
					tokensToSkip: 2, // Skip the next two backticks
					nextState: "TEXT",
				},
			};
		}

		// Check for link start, even in code blocks
		if (isLinkStart(input)) {
			// Enter link mode
			return {
				...sm,
				// Don't add the opening < to the result
				currentState: {
					state: "LINK",
					url: "",
					displayText: null,
					parsingPhase: "url",
					nextState: "CODE_BLOCK",
				},
			};
		}

		// Handle special characters even in code blocks
		const specialCharsResult = handleSpecialCharacters(sm, input, "CODE_BLOCK");
		if (specialCharsResult !== null) {
			return specialCharsResult;
		}

		// Process content within the code block
		return {
			...sm,
			result: sm.result + input.currentToken,
			currentState: { state: "CODE_BLOCK" },
		};
	},
	LINK: (sm: StateMachine, input: StateMachineInput): StateMachine => {
		const linkData = sm.currentState as LinkStateData;
		
		// Handle link closing
		if (input.currentToken === ">") {
			const url = linkData.url;
			const displayText = linkData.displayText || url;
			
			// Format as markdown link: [display](url)
			const markdownLink = `[${displayText}](${url})`;
			
			return {
				...sm,
				result: sm.result + markdownLink,
				currentState: {
					state: input.nextTokens.length > 0 ? linkData.nextState : "END",
				},
			};
		}
		
		// Handle separator between URL and display text
		if (input.currentToken === "|" && linkData.parsingPhase === "url") {
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
		return sm;
	},
	END: (sm: StateMachine, _input: StateMachineInput): StateMachine => {
		return sm;
	},
	SKIP_TOKENS: (sm: StateMachine, _input: StateMachineInput): StateMachine => {
		const skipData = sm.currentState as SkipTokensStateData;
		const tokensToSkip = skipData.tokensToSkip;

		if (tokensToSkip <= 1) {
			// We've skipped all tokens, return to the previous state
			return {
				...sm,
				currentState: {
					state: skipData.nextState,
				},
			};
		}

		// Continue skipping tokens
		return {
			...sm,
			currentState: {
				state: "SKIP_TOKENS",
				tokensToSkip: tokensToSkip - 1,
				nextState: skipData.nextState,
			},
		};
	},
};

export const getState = (stateData: StateData): StateHandler => {
	const state = states[stateData.state];
	if (state === undefined) {
		throw new Error(`State ${stateData.state} not found`);
	}

	return state;
};

export const createStateMachine = (): StateMachine => {
	return {
		currentState: { state: "TEXT" },
		result: "",
	};
};
