import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/**
 * WebWorkerMLCEngineHandler is a handler that listens to messages from the
 * main thread and calls the corresponding functions on the MLCEngine.
 */
let handler: WebWorkerMLCEngineHandler;

self.onmessage = (msg: MessageEvent) => {
	if (!handler) {
		handler = new WebWorkerMLCEngineHandler();
	}
	handler.onmessage(msg);
};
