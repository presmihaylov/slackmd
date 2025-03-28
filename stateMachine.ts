export type StateKey =
	| "TEXT"
	| "BOLD"
	| "ITALIC"
	| "STRIKETHROUGH"
	| "INLINE_CODE"
	| "CODE_BLOCK"
	| "SKIP_TOKENS"
	| "END";

export type BasicStateKey = Exclude<StateKey, "SKIP_TOKENS">;

export type BasicStateData = {
	state: BasicStateKey;
};

export type SkipTokensStateData = {
	state: "SKIP_TOKENS";
	tokensToSkip: number;
	nextState: BasicStateKey;
};

export type StateData = BasicStateData | SkipTokensStateData;

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
		if (isCodeBlockStart(input)) {
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
