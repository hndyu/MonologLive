import { SessionHistoryManager } from "./session/session-history-manager";
import { IndexedDBWrapper } from "./storage/indexeddb-wrapper";
import type { Session } from "./types/core";

async function verify() {
	const output = document.getElementById("output")!;
	const log = (msg: string) => {
		output.innerHTML += `<div>${msg}</div>`;
		console.log(msg);
	};

	try {
		const db = new IndexedDBWrapper();
		await db.initialize();
		log("DB Initialized");

		const session: Session = {
			id: "verify-session-" + Date.now(),
			userId: "user-verify",
			startTime: new Date(),
			transcript: [
				{
					start: 0,
					end: 1,
					text: "Verification transcript",
					confidence: 1,
					isFinal: true,
				},
			],
			comments: [],
			interactions: [],
			metrics: {
				totalDuration: 10,
				commentCount: 0,
				interactionCount: 0,
				averageEngagement: 0,
			},
			title: "Original Title",
			isFavorite: false,
		};

		await db.saveSession(session);
		log("Session Saved");

		await db.updateSessionMetadata(session.id, {
			title: "Updated Title",
			isFavorite: true,
		});
		log("Session Metadata Updated");

		const manager = new SessionHistoryManager(db);
		const results = await manager.getSessions({
			userId: "user-verify",
			isFavorite: true,
			searchQuery: "Updated",
		});

		if (results.length > 0 && results.some((s) => s.id === session.id)) {
			log("SUCCESS: Session found with updated metadata.");
			output.innerHTML += `<h2 style="color:green">VERIFICATION PASSED</h2>`;
		} else {
			log("FAILURE: Session not found or metadata mismatch.");
			log("Results: " + JSON.stringify(results));
			output.innerHTML += `<h2 style="color:red">VERIFICATION FAILED</h2>`;
		}

		// Cleanup
		await db.deleteSession(session.id);
	} catch (e) {
		log("ERROR: " + e);
		output.innerHTML += `<h2 style="color:red">VERIFICATION FAILED WITH ERROR</h2>`;
	}
}

verify();
