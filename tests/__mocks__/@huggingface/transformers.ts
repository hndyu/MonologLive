// Mock for @huggingface/transformers
export const pipeline = jest.fn().mockResolvedValue(async () => {
	return [{ transcription: "Mock transcribed text" }];
});

// biome-ignore lint/complexity/noStaticOnlyClass: Mock class
export class AutoModel {
	static from_pretrained = jest.fn().mockResolvedValue({});
}

// biome-ignore lint/complexity/noStaticOnlyClass: Mock class
export class AutoProcessor {
	static from_pretrained = jest.fn().mockResolvedValue({});
}
