// Comment role definitions and pattern libraries for MONOLOG LIVE

import type {
	CommentRole,
	TriggerCondition,
} from "../interfaces/comment-generation";
import type { CommentRoleType, ConversationContext } from "../types/core";

/**
 * Pattern library for each comment role type
 * Based on requirements 3.1-3.8 for authentic Japanese live stream comments
 */
export const COMMENT_PATTERNS: Record<CommentRoleType, string[]> = {
	greeting: [
		"こんばんは！",
		"おはよう～",
		"初見です",
		"こんにちは！",
		"お疲れ様です",
		"きたー！",
		"おつかれ！",
		"はじめまして",
		"よろしくお願いします",
		"こんばんわ〜",
	],

	departure: [
		"そろそろ寝ます",
		"おやすみ〜",
		"お疲れ様",
		"また明日！",
		"おつかれさまでした",
		"また来ます",
		"ばいばい〜",
		"お先に失礼します",
		"また今度！",
		"おやすみなさい",
	],

	reaction: [
		"かわいい",
		"草",
		"ｗｗｗ",
		"天才",
		"すごい！",
		"やばい",
		"えー！",
		"まじで？",
		"うける",
		"www",
		"笑った",
		"おもしろい",
		"びっくり",
		"すげー",
	],

	agreement: [
		"たしかに",
		"それな",
		"わかる",
		"そうそう",
		"ほんとそれ",
		"めっちゃわかる",
		"そうだよね",
		"だよね〜",
		"わかりみ",
		"それ！",
		"ほんとに",
		"そう思う",
		"まさに",
		"その通り",
	],

	question: [
		"今日何してた？",
		"最近ハマってるものある？",
		"どうだった？",
		"なにそれ？",
		"どこの？",
		"いつから？",
		"なんで？",
		"どんな感じ？",
		"おいしかった？",
		"楽しかった？",
		"どうやって？",
		"誰と？",
		"何時から？",
		"どこで？",
	],

	insider: [
		"いつもの",
		"出たｗ",
		"安定だな",
		"またか",
		"お約束",
		"きたきた",
		"はじまった",
		"いつものやつ",
		"定番",
		"またこれ",
		"お決まり",
		"パターン",
		"いつものパターン",
		"やっぱり",
	],

	support: [
		"無理しないでね",
		"応援してます",
		"がんばって",
		"お疲れ様",
		"ゆっくりしてね",
		"体調大丈夫？",
		"気をつけて",
		"ファイト！",
		"応援してる",
		"頑張れ〜",
		"大丈夫？",
		"休んでね",
		"無理は禁物",
		"お身体お大事に",
	],

	playful: [
		"今の伏線？",
		"台本ですか？",
		"やらせ？",
		"仕込み？",
		"ネタバレ",
		"スクリプト通り",
		"演技うまい",
		"お芝居？",
		"計画通り",
		"シナリオ？",
		"予定調和",
		"できレース",
		"茶番",
		"コント？",
	],
};

/**
 * Trigger conditions for each comment role
 * Defines when each role should be activated based on context
 */
export const ROLE_TRIGGERS: Record<CommentRoleType, TriggerCondition[]> = {
	greeting: [
		{ type: "keyword", value: "はじめ", operator: "contains" },
		{ type: "keyword", value: "初回", operator: "contains" },
		{ type: "silence", value: 30, operator: "greater" },
		{ type: "topic", value: "session_start", operator: "equals" },
	],

	departure: [
		{ type: "keyword", value: "終わり", operator: "contains" },
		{ type: "keyword", value: "疲れ", operator: "contains" },
		{ type: "keyword", value: "寝る", operator: "contains" },
		{ type: "topic", value: "session_end", operator: "equals" },
	],

	reaction: [
		{ type: "emotion", value: "excitement", operator: "equals" },
		{ type: "volume", value: 0.7, operator: "greater" },
		{ type: "keyword", value: "！", operator: "contains" },
		{ type: "keyword", value: "すごい", operator: "contains" },
	],

	agreement: [
		{ type: "keyword", value: "そう", operator: "contains" },
		{ type: "keyword", value: "やっぱり", operator: "contains" },
		{ type: "keyword", value: "でも", operator: "contains" },
		{ type: "emotion", value: "agreement", operator: "equals" },
	],

	question: [
		{ type: "silence", value: 10, operator: "greater" },
		{ type: "keyword", value: "？", operator: "contains" },
		{ type: "topic", value: "new_topic", operator: "equals" },
		{ type: "emotion", value: "curiosity", operator: "equals" },
	],

	insider: [
		{ type: "keyword", value: "また", operator: "contains" },
		{ type: "keyword", value: "いつも", operator: "contains" },
		{ type: "topic", value: "recurring_topic", operator: "equals" },
		{ type: "emotion", value: "familiarity", operator: "equals" },
	],

	support: [
		{ type: "keyword", value: "疲れ", operator: "contains" },
		{ type: "keyword", value: "大変", operator: "contains" },
		{ type: "keyword", value: "辛い", operator: "contains" },
		{ type: "emotion", value: "stress", operator: "equals" },
	],

	playful: [
		{ type: "keyword", value: "偶然", operator: "contains" },
		{ type: "keyword", value: "たまたま", operator: "contains" },
		{ type: "emotion", value: "suspicion", operator: "equals" },
		{ type: "topic", value: "coincidence", operator: "equals" },
	],
};

/**
 * Default role weights for balanced comment generation
 * Can be adjusted based on user preferences and learning
 */
export const DEFAULT_ROLE_WEIGHTS: Record<CommentRoleType, number> = {
	greeting: 0.1,
	departure: 0.05,
	reaction: 0.25,
	agreement: 0.2,
	question: 0.15,
	insider: 0.1,
	support: 0.1,
	playful: 0.05,
};

/**
 * Creates a complete CommentRole object with patterns and triggers
 */
export function createCommentRole(
	type: CommentRoleType,
	weight?: number,
): CommentRole {
	return {
		type,
		weight: weight ?? DEFAULT_ROLE_WEIGHTS[type],
		patterns: COMMENT_PATTERNS[type],
		triggers: ROLE_TRIGGERS[type],
	};
}

/**
 * Creates all comment roles with default or custom weights
 */
export function createAllCommentRoles(
	customWeights?: Partial<Record<CommentRoleType, number>>,
): CommentRole[] {
	const roleTypes: CommentRoleType[] = [
		"greeting",
		"departure",
		"reaction",
		"agreement",
		"question",
		"insider",
		"support",
		"playful",
	];

	return roleTypes.map((type) =>
		createCommentRole(type, customWeights?.[type]),
	);
}

/**
 * Role selection algorithm based on context and weights
 */
export class RoleSelector {
	private roles: CommentRole[];

	constructor(roles: CommentRole[]) {
		this.roles = roles;
	}

	/**
	 * Selects appropriate roles based on conversation context
	 * Returns roles sorted by relevance score
	 */
	selectRoles(context: ConversationContext): CommentRole[] {
		const scoredRoles = this.roles.map((role) => ({
			role,
			score: this.calculateRoleScore(role, context),
		}));

		// Sort by score descending and return roles
		return scoredRoles
			.sort((a, b) => b.score - a.score)
			.map((item) => item.role);
	}

	/**
	 * Returns the list of available roles
	 */
	getRoles(): CommentRole[] {
		return this.roles;
	}

	/**
	 * Calculates relevance score for a role given the context
	 */
	private calculateRoleScore(
		role: CommentRole,
		context: ConversationContext,
	): number {
		let score = role.weight;

		// Check trigger conditions
		for (const trigger of role.triggers) {
			if (this.evaluateTrigger(trigger, context)) {
				score += 0.3; // Boost score for matching triggers
			}
		}

		return Math.min(score, 1.0); // Cap at 1.0
	}

	/**
	 * Evaluates if a trigger condition matches the context
	 */
	private evaluateTrigger(
		trigger: TriggerCondition,
		context: ConversationContext,
	): boolean {
		const contextValue = this.getContextValue(trigger.type, context);

		if (contextValue === undefined) return false;

		switch (trigger.operator) {
			case "equals":
				return contextValue === trigger.value;
			case "contains":
				return (
					typeof contextValue === "string" &&
					contextValue.includes(trigger.value as string)
				);
			case "greater":
				return (
					typeof contextValue === "number" &&
					contextValue > (trigger.value as number)
				);
			case "less":
				return (
					typeof contextValue === "number" &&
					contextValue < (trigger.value as number)
				);
			default:
				return false;
		}
	}

	/**
	 * Extracts relevant value from context based on trigger type
	 */
	private getContextValue(
		triggerType: string,
		context: ConversationContext,
	): string | number | undefined {
		switch (triggerType) {
			case "keyword":
				return context.recentTranscript || "";
			case "emotion":
				return context.detectedEmotion || "neutral";
			case "silence":
				return context.silenceDuration || 0;
			case "volume":
				return context.speechVolume || 0;
			case "topic":
				return context.currentTopic || "";
			default:
				return undefined;
		}
	}

	/**
	 * Updates role weights based on user feedback
	 */
	updateRoleWeights(roleType: CommentRoleType, adjustment: number): void {
		const role = this.roles.find((r) => r.type === roleType);
		if (role) {
			role.weight = Math.max(0, Math.min(1, role.weight + adjustment));
		}
	}

	/**
	 * Gets current role weights
	 */
	getRoleWeights(): Record<CommentRoleType, number> {
		const weights: Partial<Record<CommentRoleType, number>> = {};
		this.roles.forEach((role) => {
			weights[role.type] = role.weight;
		});
		return weights as Record<CommentRoleType, number>;
	}
}
