export type StateKey =
	| "TEXT"
	| "BOLD"
	| "ITALIC"
	| "STRIKETHROUGH"
	| "INLINE_CODE"
	| "END";

export type StateMachineInput = {
	previousTokens: string[];
	currentToken: string;
	nextTokens: string[];
};

export type StateMachine = {
	currentState: StateKey;
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

const createFormattedTextStateHandler = (
	stateKey: StateKey,
	formatToken: string,
	times: number,
): StateHandler => {
	return (sm: StateMachine, input: StateMachineInput): StateMachine => {
		if (input.currentToken === formatToken) {
			return {
				...sm,
				result: sm.result + formatToken.repeat(times),
				currentState: input.nextTokens.length > 0 ? "TEXT" : "END",
			};
		} else {
			return {
				...sm,
				result: sm.result + input.currentToken,
				currentState: stateKey,
			};
		}
	};
};

const states: Record<string, StateHandler> = {
	TEXT: (sm: StateMachine, input: StateMachineInput): StateMachine => {
		if (shouldEnterFormattedText(input, "*")) {
			return {
				...sm,
				result: sm.result + "**",
				currentState: "BOLD",
			};
		} else if (shouldEnterFormattedText(input, "_")) {
			return {
				...sm,
				result: sm.result + "_",
				currentState: "ITALIC",
			};
		} else if (shouldEnterFormattedText(input, "~")) {
			return {
				...sm,
				result: sm.result + "~~",
				currentState: "STRIKETHROUGH",
			};
		} else if (input.currentToken === "\u2022") {
			// bullet point
			return {
				...sm,
				result: sm.result + "*",
				currentState: input.nextTokens.length > 0 ? "TEXT" : "END",
			};
		}

		return {
			...sm,
			result: sm.result + input.currentToken,
			currentState: input.nextTokens.length > 0 ? "TEXT" : "END",
		};
	},
	BOLD: createFormattedTextStateHandler("BOLD", "*", 2),
	ITALIC: createFormattedTextStateHandler("ITALIC", "_", 1),
	STRIKETHROUGH: createFormattedTextStateHandler("STRIKETHROUGH", "~", 2),
	INLINE_CODE: createFormattedTextStateHandler("INLINE_CODE", "`", 1),
	END: (sm: StateMachine, _input: StateMachineInput): StateMachine => {
		return sm;
	},
};

export const getState = (key: StateKey): StateHandler => {
	const state = states[key];
	if (state === undefined) {
		throw new Error(`State ${key} not found`);
	}

	return state;
};

export const createStateMachine = (): StateMachine => {
	return {
		currentState: "TEXT",
		result: "",
	};
};
