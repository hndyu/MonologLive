// Mock for @mlc-ai/web-llm
export const CreateWebWorkerMLCEngine = jest.fn().mockResolvedValue({
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
});

export const prebuiltAppConfig = {
	model_list: [
		{
			model_id: "Llama-2-7b-chat-hf-q4f16_1",
			local_id: "Llama-2-7b-chat-hf-q4f16_1",
		},
	],
};
