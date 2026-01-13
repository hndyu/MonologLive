/**
 * Utility to safely access environment variables in both Vite and Jest environments.
 */
export const getEnvVar = (key: string): string | undefined => {
	// In Vite, import.meta.env is available.
	// In Jest, we mock this module or use process.env.
	try {
		const meta = import.meta as ImportMeta & {
			env?: Record<string, string | undefined>;
		};
		return meta.env?.[key];
	} catch (_e) {
		// Fallback for non-ESM or environments where import.meta is not available
		return typeof process !== "undefined" ? process.env[key] : undefined;
	}
};
