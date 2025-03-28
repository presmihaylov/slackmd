import type { StateMachineInput } from "./stateMachine";
import { createStateMachine, getState } from "./stateMachine";

/**
 * Converts Slack markdown to standard markdown format
 * @param text The Slack markdown text to convert
 * @returns Standard markdown formatted text
 */
export function slackMarkdownToMarkdown(text: string): string {
	const tokens = text.split("");

	let machine = createStateMachine();
	for (let i = 0; i < tokens.length; i++) {
		const currentToken = tokens[i] ?? "";
		const input: StateMachineInput = {
			previousTokens: tokens.slice(0, i),
			currentToken,
			nextTokens: tokens.slice(i + 1),
		};

		machine = getState(machine.currentState)(machine, input);
		if (machine.currentState.state === "END") {
			break;
		}
	}

	return machine.result;
}
