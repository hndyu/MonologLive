// Mock for WebLLMProcessor
// biome-ignore lint/complexity/noStaticOnlyClass: Mock class
export class WebLLMProcessor {
	static async createEngine(_modelId: string) {
		return {
			chat: {
				completions: {
					create: jest.fn().mockResolvedValue({
						choices: [
							{
								message: {
									content: "Mock comment response",
								},
							},
						],
					}),
				},
			},
			reload: jest.fn().mockResolvedValue(undefined),
			unload: jest.fn().mockResolvedValue(undefined),
		};
	}

	static async generateComment(
		_context: unknown,
		_engine: unknown
	): Promise<string> {
		return "Mock generated comment";
	}
}
