export function createWebLLMWorker(): Worker {
	if (typeof window === "undefined" || !import.meta.url) {
		throw new Error("Cannot create worker: Environment not supported");
	}
	return new Worker(new URL("./webworker.ts", import.meta.url), {
		type: "module",
	});
}
