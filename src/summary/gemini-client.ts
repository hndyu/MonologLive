import type { SessionSummary } from "../types/core";

/**
 * Client for interacting with the Google Gemini API to generate session summaries.
 */
export class GeminiClientImpl {
	private readonly API_URL =
		"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

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
      You are an expert AI assistant helping a user build a "Second Brain".
      Analyze the following transcript from a monologue/conversation session and provide a structured summary in JSON format.

      Transcript:
      "${transcript}"

      Required JSON structure:
      {
        "overallSummary": "A concise summary of the session",
        "topics": [
          { "name": "Topic Name", "relevance": 0.0-1.0, "mentions": 1, "sentiment": 0.0 }
        ],
        "insights": [
          { "type": "type_of_insight", "content": "The insight content", "confidence": 0.9 }
        ]
      }

      Focus on extracting personal values, interests, and key takeaways for the user's "Second Brain".
      Respond ONLY with the JSON object.
    `;

		try {
			const response = await fetch(`${this.API_URL}?key=${apiKey}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [{ text: prompt }],
						},
					],
					generationConfig: {
						response_mime_type: "application/json",
					},
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					`Gemini API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`,
				);
			}

			const data = await response.json();
			const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

			if (!resultText) {
				throw new Error("Invalid response structure from Gemini API");
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
			console.error("Gemini API call failed:", error);
			throw error;
		}
	}
}
