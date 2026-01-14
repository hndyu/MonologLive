import {
	ErrorSeverity,
	ErrorType,
	MonologAppError,
} from "../error-handling/index.js";
import type { SessionSummary } from "../types/core";

/**
 * Client for interacting with the Google Gemini API to generate session summaries.
 */
export class GeminiClientImpl {
	private readonly API_URL =
		"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

	/**
	 * Generates a structured summary from session transcript using Gemini API.
	 * @param sessionId The ID of the session
	 * @param transcript The full transcript text
	 * @param apiKey The Gemini API key
	 * @returns A SessionSummary object
	 */
	async generateSummary(
		sessionId: string,
		transcript: string,
		apiKey: string,
	): Promise<SessionSummary> {
		const prompt = `
      あなたは、ユーザーの「セカンドブレイン」構築を支援する、熟練したAIアシスタントです。
      以下のモノローグ/会話セッションのトランスクリプトを分析し、JSON形式で構造化された要約を作成してください。

      トランスクリプト:
      "${transcript}"

      ユーザーの「セカンドブレイン」として、個人的な価値観、興味、そして重要なポイントを抽出することに重点を置いてください。
      JSONオブジェクトのみで応答してください。
    `;

		try {
			const response = await fetch(`${this.API_URL}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-goog-api-key": `${apiKey}`,
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [{ text: prompt }],
						},
					],
					generationConfig: {
						response_mime_type: "application/json",
						responseJsonSchema: {
							type: "object",
							properties: {
								overallSummary: {
									type: "string",
									description: "セッションの簡潔な要約",
								},
								topics: {
									type: "array",
									items: {
										type: "object",
										properties: {
											name: {
												type: "string",
												description: "トピック名",
											},
											relevance: {
												type: "number",
												description: "トピックの関連度（0.0-1.0）",
												minimum: 0.0,
												maximum: 1.0,
											},
											mentions: {
												type: "number",
												description: "トピックの提唱回数",
												minimum: 0,
												maximum: 100,
											},
											sentiment: {
												type: "number",
												description: "トピックの感情度（-1.0-1.0）",
												minimum: -1.0,
												maximum: 1.0,
											},
										},
										required: ["name", "relevance", "mentions", "sentiment"],
									},
								},
								insights: {
									type: "array",
									items: {
										type: "object",
										properties: {
											type: {
												type: "string",
												description: "インサイトの種類",
											},
											content: {
												type: "string",
												description: "インサイトの内容",
											},
											confidence: {
												type: "number",
												description: "インサイトの信頼度（0.0-1.0）",
												minimum: 0.0,
												maximum: 1.0,
											},
										},
									},
								},
							},
							required: ["overallSummary", "topics", "insights"],
						},
					},
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new MonologAppError(
					ErrorType.NETWORK,
					ErrorSeverity.HIGH,
					`Gemini API error: ${response.status} ${response.statusText}`,
					new Error(JSON.stringify(errorData)),
					{ status: response.status, statusText: response.statusText },
				);
			}

			const data = await response.json();
			const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

			if (!resultText) {
				throw new MonologAppError(
					ErrorType.COMMENT_GENERATION,
					ErrorSeverity.HIGH,
					"Invalid response structure from Gemini API",
				);
			}

			const parsed = JSON.parse(resultText);

			return {
				sessionId,
				overallSummary: parsed.overallSummary || "No summary generated.",
				topics: parsed.topics || [],
				insights: parsed.insights || [],
				generatedAt: new Date(),
			};
		} catch (error) {
			if (error instanceof MonologAppError) {
				throw error;
			}
			throw new MonologAppError(
				ErrorType.COMMENT_GENERATION,
				ErrorSeverity.HIGH,
				`Gemini API call failed: ${error instanceof Error ? error.message : String(error)}`,
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}
}
