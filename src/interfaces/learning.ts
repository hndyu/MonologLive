// Learning and personalization interfaces

import type { Comment, CommentRoleType } from "../types/core.js";

export interface LearningModule {
	trackInteraction(comment: Comment, userResponse: UserResponse): void;
	updatePreferences(userId: string, feedback: Feedback): void;
	getPersonalizedWeights(userId: string): Map<CommentRoleType, number>;
	detectCommentPickup(
		comment: Comment,
		subsequentSpeech: string,
		timing: number,
	): number;
}

export interface UserResponse {
	type: "speech" | "click" | "feedback";
	content?: string;
	timestamp: Date;
	confidence: number;
}

export interface Feedback {
	commentId: string;
	type: "thumbs_up" | "thumbs_down" | "pickup";
	strength: number;
	timestamp: Date;
}
