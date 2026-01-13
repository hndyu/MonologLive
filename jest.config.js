export default {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	roots: ["<rootDir>/src", "<rootDir>/tests"],
	testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
	transform: {
		"^.+.ts$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
	collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
	setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@mlc-ai/web-llm$": "<rootDir>/tests/__mocks__/@mlc-ai/web-llm.js",
		"^@huggingface/transformers$":
			"<rootDir>/tests/__mocks__/@huggingface/transformers.ts",
		"webllm-processor$": "<rootDir>/tests/__mocks__/webllm-processor.ts",
		"\\.(css|less|scss|sass)$": "<rootDir>/tests/__mocks__/styleMock.js",
		// Map .js extensions to .ts for local imports in ESM projects
		"^(..*).js$": "$1",
	},
	extensionsToTreatAsEsm: [".ts"],
	testTimeout: 30000,
	transformIgnorePatterns: [
		"/node_modules/(?!(@huggingface/transformers|@mlc-ai/web-llm)/)",
	],
};
