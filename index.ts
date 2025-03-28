import type { StateMachineInput } from "./stateMachine";
import { createStateMachine, getState } from "./stateMachine";
import { Logger, LogLevel } from "./logger";

/**
 * Converts Slack markdown to standard markdown format
 * @param text The Slack markdown text to convert
 * @param logLevel The level of logging (defaults to ERROR only)
 * @returns Standard markdown formatted text
 */
export function slackMarkdownToMarkdown(text: string, logLevel: LogLevel = LogLevel.ERROR): string {
	const log = new Logger(logLevel);
	const tokens = text.split("");

	let machine = createStateMachine(log);
	log.info(`Starting conversion with initial state: ${machine.currentState.state}`);

	for (let i = 0; i < tokens.length; i++) {
		const currentToken = tokens[i] ?? "";
		const input: StateMachineInput = {
			previousTokens: tokens.slice(0, i),
			currentToken,
			nextTokens: tokens.slice(i + 1),
		};
		
		log.trace(`Processing token [${i}]: "${currentToken}" in state: ${machine.currentState.state}`);
		if (input.nextTokens.length > 0) {
			log.trace(`Next token: "${input.nextTokens[0]}"`);
		}

		try {
			const stateHandler = getState(machine);
			const prevState = machine.currentState.state;
			machine = stateHandler(machine, input);
			
			if (prevState !== machine.currentState.state) {
				log.debug(`State transition: ${prevState} -> ${machine.currentState.state}`);
			}
		} catch (error) {
			log.error(`Error processing token "${currentToken}":`, error);
			log.warn(`Recovering by keeping token as plain text`);
			
			// If there's an error, stay in the same state and continue parsing
			// Just add the current token to the result
			machine = {
				...machine,
				result: machine.result + currentToken,
			};
		}
		
		if (machine.currentState.state === "END") {
			log.debug(`Reached END state, breaking`);
			break;
		}
	}

	log.info(`Conversion complete. Result length: ${machine.result.length}`);

	return machine.result;
}