export default {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	roots: ["<rootDir>/src", "<rootDir>/tests"],
	testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
	transform: {
		"^.+\\.ts$": ["ts-jest", {
			useESM: true,
		}],
	},
	collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
	setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
	moduleNameMapping: {
		"^@/(.*)$": "<rootDir>/src/$1",
	},
	extensionsToTreatAsEsm: [".ts"],
	testTimeout: 30000,
};
