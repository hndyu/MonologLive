// User preference management UI component

import type { PreferenceLearningSystem } from "../learning/preference-learning.js";
import type { CommentRoleType } from "../types/core.js";

/**
 * Configuration for preference management UI
 */
export interface PreferenceUIConfig {
	showWeightValues: boolean;
	enableManualAdjustment: boolean;
	showLearningStats: boolean;
	updateInterval: number; // milliseconds
}

/**
 * Default configuration for preference UI
 */
export const DEFAULT_PREFERENCE_UI_CONFIG: PreferenceUIConfig = {
	showWeightValues: true,
	enableManualAdjustment: false, // Keep simple for now
	showLearningStats: true,
	updateInterval: 2000,
};

/**
 * User preference management UI component
 * Implements Requirement 7.4 - Add user preference management UI
 */
export class PreferenceManagementUI {
	private container: HTMLElement;
	private preferenceLearning: PreferenceLearningSystem;
	private config: PreferenceUIConfig;
	private updateTimer: number | null = null;
	private currentUserId: string | null = null;

	constructor(
		container: HTMLElement,
		preferenceLearning: PreferenceLearningSystem,
		config: PreferenceUIConfig = DEFAULT_PREFERENCE_UI_CONFIG,
	) {
		this.container = container;
		this.preferenceLearning = preferenceLearning;
		this.config = config;
		this.initialize();
	}

	/**
	 * Initializes the preference management UI
	 */
	private initialize(): void {
		const existingKey = localStorage.getItem("GEMINI_API_KEY") || "";

		this.container.className = "preference-management";
		this.container.innerHTML = `
      <div class="preference-header">
        <h3>Comment Preferences</h3>
        <p class="preference-description">The system learns your preferences based on your interactions</p>
      </div>
      <div class="preference-content">
        <div class="role-weights" id="roleWeights">
          <!-- Role weights will be populated here -->
        </div>
        <div class="learning-stats" id="learningStats">
          <!-- Learning statistics will be populated here -->
        </div>
        
        <div class="ai-settings">
          <h4>AI Settings</h4>
          <div class="setting-item">
            <label for="geminiApiKey">Gemini API Key</label>
            <input type="password" id="geminiApiKey" value="${existingKey}" placeholder="Enter your Gemini API key">
            <p class="setting-hint">Required for high-quality session summaries. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Get a key here</a></p>
          </div>
        </div>
      </div>
      <div class="preference-actions">
        <button id="resetPreferences" class="reset-btn">Reset to Defaults</button>
        <button id="refreshData" class="refresh-btn">Refresh</button>
      </div>
    `;

		this.attachEventListeners();
		this.applyStyles();
	}

	/**
	 * Sets the current user and starts updating the display
	 */
	setUser(userId: string): void {
		this.currentUserId = userId;
		this.startPeriodicUpdates();
		this.updateDisplay();
	}

	/**
	 * Updates the preference display
	 */
	private async updateDisplay(): Promise<void> {
		if (!this.currentUserId) {
			return;
		}

		await this.updateRoleWeights();

		if (this.config.showLearningStats) {
			this.updateLearningStats();
		}
	}

	/**
	 * Updates the role weights display
	 */
	private async updateRoleWeights(): Promise<void> {
		if (!this.currentUserId) return;

		const weights = this.preferenceLearning.getPersonalizedWeights(
			this.currentUserId,
		);
		const roleWeightsContainer = this.container.querySelector("#roleWeights");

		if (!roleWeightsContainer) return;

		const roleDisplayNames: Record<CommentRoleType, string> = {
			greeting: "Greetings",
			departure: "Farewells",
			reaction: "Reactions",
			agreement: "Agreement",
			question: "Questions",
			insider: "Insider Comments",
			support: "Support",
			playful: "Playful/Teasing",
		};

		let html = "<h4>Comment Role Preferences</h4>";

		// Sort roles by weight (highest first)
		const sortedRoles = Array.from((await weights).entries()).sort(
			([, a], [, b]) => b - a,
		);

		for (const [role, weight] of sortedRoles) {
			const percentage = Math.round((weight / 2.0) * 100); // Assuming max weight is 2.0
			const barWidth = Math.min(100, percentage);

			html += `
        <div class="role-weight-item">
          <div class="role-info">
            <span class="role-name">${roleDisplayNames[role]}</span>
            ${this.config.showWeightValues ? `<span class="role-value">${weight.toFixed(2)}</span>` : ""}
          </div>
          <div class="weight-bar">
            <div class="weight-fill" style="width: ${barWidth}%"></div>
          </div>
        </div>
      `;
		}

		roleWeightsContainer.innerHTML = html;
	}

	/**
	 * Updates the learning statistics display
	 */
	private updateLearningStats(): void {
		const stats = this.preferenceLearning.getLearningStats();
		const statsContainer = this.container.querySelector("#learningStats");

		if (!statsContainer) return;

		const ranking = this.preferenceLearning.getPreferenceRanking();

		let html = "<h4>Learning Statistics</h4>";
		html += `
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Total Feedback Events:</span>
          <span class="stat-value">${stats.totalFeedbackEvents}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Average Weight:</span>
          <span class="stat-value">${stats.averageWeight.toFixed(2)}</span>
        </div>
        ${
					ranking
						? `
          <div class="stat-item">
            <span class="stat-label">Most Preferred:</span>
            <span class="stat-value preferred">${ranking.most}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Least Preferred:</span>
            <span class="stat-value less-preferred">${ranking.least}</span>
          </div>
        `
						: ""
				}
      </div>
    `;

		statsContainer.innerHTML = html;
	}

	/**
	 * Attaches event listeners to UI elements
	 */
	private attachEventListeners(): void {
		const resetBtn = this.container.querySelector("#resetPreferences");
		const refreshBtn = this.container.querySelector("#refreshData");
		const apiKeyInput = this.container.querySelector(
			"#geminiApiKey",
		) as HTMLInputElement;

		resetBtn?.addEventListener("click", () => this.handleReset());
		refreshBtn?.addEventListener("click", () => this.updateDisplay());

		apiKeyInput?.addEventListener("change", (e) => {
			const value = (e.target as HTMLInputElement).value;
			localStorage.setItem("GEMINI_API_KEY", value.trim());
		});
	}

	/**
	 * Handles preference reset
	 */
	private async handleReset(): Promise<void> {
		if (!this.currentUserId) return;

		if (
			confirm(
				"Are you sure you want to reset your preferences to defaults? This cannot be undone.",
			)
		) {
			await this.preferenceLearning.resetPreferences(this.currentUserId);
			await this.updateDisplay();
		}
	}

	/**
	 * Starts periodic updates of the display
	 */
	private startPeriodicUpdates(): void {
		this.stopPeriodicUpdates();

		this.updateTimer = window.setInterval(() => {
			this.updateDisplay();
		}, this.config.updateInterval);
	}

	/**
	 * Stops periodic updates
	 */
	private stopPeriodicUpdates(): void {
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
			this.updateTimer = null;
		}
	}

	/**
	 * Applies CSS styles to the component
	 */
	private applyStyles(): void {
		const style = document.createElement("style");
		style.textContent = `
      .preference-management {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        margin: 10px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .preference-header h3 {
        margin: 0 0 5px 0;
        color: #333;
        font-size: 18px;
      }
      
      .preference-description {
        margin: 0 0 20px 0;
        color: #666;
        font-size: 14px;
      }
      
      .role-weight-item {
        margin-bottom: 12px;
      }
      
      .role-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      
      .role-name {
        font-weight: 500;
        color: #333;
      }
      
      .role-value {
        font-size: 12px;
        color: #666;
        font-family: monospace;
      }
      
      .weight-bar {
        height: 8px;
        background: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .weight-fill {
        height: 100%;
        background: linear-gradient(90deg, #28a745, #20c997);
        transition: width 0.3s ease;
      }
      
      .learning-stats h4 {
        margin: 20px 0 10px 0;
        color: #333;
        font-size: 16px;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      
      .stat-item {
        display: flex;
        justify-content: space-between;
        padding: 8px;
        background: white;
        border-radius: 4px;
        border: 1px solid #dee2e6;
      }
      
      .stat-label {
        font-size: 12px;
        color: #666;
      }
      
      .stat-value {
        font-weight: 500;
        color: #333;
      }
      
      .stat-value.preferred {
        color: #28a745;
      }
      
      .stat-value.less-preferred {
        color: #dc3545;
      }
      
      .preference-actions {
        margin-top: 20px;
        display: flex;
        gap: 10px;
      }
      
      .preference-actions button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }
      
      .reset-btn {
        background: #dc3545;
        color: white;
      }
      
      .reset-btn:hover {
        background: #c82333;
      }
      
      .refresh-btn {
        background: #007bff;
        color: white;
      }
      
      .refresh-btn:hover {
        background: #0056b3;
      }

      .ai-settings h4 {
        margin: 20px 0 10px 0;
        color: #333;
        font-size: 16px;
      }

      .setting-item {
        display: flex;
        flex-direction: column;
        gap: 5px;
        background: white;
        padding: 12px;
        border-radius: 4px;
        border: 1px solid #dee2e6;
      }

      .setting-item label {
        font-size: 12px;
        font-weight: bold;
        color: #666;
      }

      .setting-item input {
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
      }

      .setting-hint {
        margin: 5px 0 0 0;
        font-size: 11px;
        color: #888;
      }

      .setting-hint a {
        color: #007bff;
        text-decoration: none;
      }
    `;

		document.head.appendChild(style);
	}

	/**
	 * Updates configuration
	 */
	updateConfig(newConfig: Partial<PreferenceUIConfig>): void {
		this.config = { ...this.config, ...newConfig };

		if (newConfig.updateInterval && this.updateTimer) {
			this.startPeriodicUpdates();
		}
	}

	/**
	 * Destroys the component and cleans up resources
	 */
	destroy(): void {
		this.stopPeriodicUpdates();
		this.container.innerHTML = "";
	}
}
