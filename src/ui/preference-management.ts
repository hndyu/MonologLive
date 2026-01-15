// User preference management UI component

import type { PreferenceLearningSystem } from "../learning/preference-learning.js";
import { lazyLoader } from "../performance/index.js";
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
		console.log("Initializing PreferenceManagementUI...");
		const existingKey = localStorage.getItem("GEMINI_API_KEY") || "";
		const preloadEnabled =
			localStorage.getItem("WHISPER_PRELOAD_ENABLED") === "true";

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

        <button id="resetPreferences" class="subtle-reset-btn">Reset Preferences to Default</button>
        
        <div class="ai-settings">
          <h4>AI Settings</h4>
          <div class="setting-item">
            <label for="geminiApiKey">Gemini API Key</label>
            <input type="password" id="geminiApiKey" value="${existingKey}" placeholder="Enter your Gemini API key" autocomplete="new-password">
            <p class="setting-hint">Required for high-quality session summaries. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Get a key here</a></p>
          </div>
        </div>

        <div class="performance-settings">
          <h4>Performance Settings</h4>
          <div class="setting-item toggle-item">
            <div class="setting-info">
              <label for="whisperPreload">Background Pre-load</label>
              <p class="setting-hint">Load Whisper AI library in the background for faster transcription activation.</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="whisperPreload" ${preloadEnabled ? "checked" : ""}>
              <span class="slider round"></span>
            </label>
          </div>
          <p class="setting-hint warning-hint">Note: Loading AI libraries consumes approximately 40MB-100MB of memory.</p>
        </div>
      </div>
    `;

		this.attachEventListeners();
		this.applyStyles();
		console.log("PreferenceManagementUI initialized successfully");
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
		const apiKeyInput = this.container.querySelector(
			"#geminiApiKey",
		) as HTMLInputElement;
		const preloadToggle = this.container.querySelector(
			"#whisperPreload",
		) as HTMLInputElement;

		resetBtn?.addEventListener("click", () => this.handleReset());

		apiKeyInput?.addEventListener("change", (e) => {
			const value = (e.target as HTMLInputElement).value;
			localStorage.setItem("GEMINI_API_KEY", value.trim());
		});

		preloadToggle?.addEventListener("change", async (e) => {
			const checked = (e.target as HTMLInputElement).checked;
			localStorage.setItem("WHISPER_PRELOAD_ENABLED", String(checked));

			if (checked) {
				await this.handlePreloadActivation();
			}
		});
	}

	/**
	 * Handles the activation of background preloading
	 */
	private async handlePreloadActivation(): Promise<void> {
		const statusHint = this.container.querySelector(
			".performance-settings .setting-hint",
		);
		const originalText = statusHint?.textContent || "";

		try {
			if (statusHint) {
				statusHint.textContent = "Loading AI library (approx. 40MB)...";
				statusHint.classList.add("loading");
			}

			await lazyLoader.loadFeature("enhanced-transcription");

			if (statusHint) {
				statusHint.textContent = "AI library loaded successfully.";
				statusHint.classList.remove("loading");
				statusHint.classList.add("success");

				// Reset after a few seconds
				setTimeout(() => {
					statusHint.textContent = originalText;
					statusHint.classList.remove("success");
				}, 3000);
			}
		} catch (error) {
			console.error("Manual preload failed:", error);
			if (statusHint) {
				statusHint.textContent =
					"Failed to load AI library. Please check your connection.";
				statusHint.classList.remove("loading");
				statusHint.classList.add("error");
			}
		}
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
		if (document.getElementById("preference-management-styles")) {
			return;
		}

		const style = document.createElement("style");
		style.id = "preference-management-styles";
		style.textContent = `
      .preference-management {
        background: transparent;
        padding: 0;
        margin: 0;
        font-family: inherit;
      }
      
      .preference-header h3 {
        margin: 0 0 5px 0;
        color: var(--text-main);
        font-size: 18px;
      }
      
      .preference-description {
        margin: 0 0 20px 0;
        color: var(--text-dim);
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
        color: var(--text-main);
      }
      
      .role-value {
        font-size: 12px;
        color: var(--text-dim);
        font-family: monospace;
      }
      
      .weight-bar {
        height: 8px;
        background: var(--border-color);
        border-radius: 4px;
        overflow: hidden;
      }
      
      .weight-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary-color), #c084fc);
        transition: width 0.3s ease;
      }
      
      .learning-stats h4, .ai-settings h4, .performance-settings h4 {
        margin: 24px 0 12px 0;
        color: var(--text-main);
        font-size: 16px;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 8px;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      
      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 10px;
        background: #0f172a;
        border-radius: 8px;
        border: 1px solid var(--border-color);
      }
      
      .stat-label {
        font-size: 11px;
        color: var(--text-dim);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      
      .stat-value {
        font-weight: 600;
        color: var(--text-main);
        font-size: 14px;
      }
      
      .stat-value.preferred {
        color: #4ade80;
      }
      
      .stat-value.less-preferred {
        color: #f87171;
      }
      
      .subtle-reset-btn {
        display: block;
        width: fit-content;
        margin: 10px 0 0 auto;
        padding: 4px 8px;
        background: transparent;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        color: var(--text-dim);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .subtle-reset-btn:hover {
        border-color: var(--text-dim);
        color: var(--text-main);
        background: rgba(255, 255, 255, 0.05);
      }

      .setting-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: #0f172a;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        margin-bottom: 12px;
      }

      .setting-item.toggle-item {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }

      .setting-info {
        flex: 1;
      }

      .setting-item label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-dim);
      }

      .setting-item input {
        padding: 10px;
        background: #1e293b;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        color: var(--text-main);
        font-size: 14px;
      }

      .setting-item input:focus {
        outline: 2px solid var(--primary-color);
        border-color: transparent;
      }

      .setting-hint {
        margin: 4px 0 0 0;
        font-size: 12px;
        color: var(--text-dim);
        line-height: 1.4;
      }

      .setting-hint.warning-hint {
        font-style: italic;
        margin-top: -4px;
        margin-bottom: 12px;
      }

      .setting-hint.loading {
        color: var(--primary-color);
        animation: pulse 1.5s infinite;
      }

      .setting-hint.success {
        color: #4ade80;
      }

      .setting-hint.error {
        color: #f87171;
      }

      @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }

      .setting-hint a {
        color: var(--primary-color);
        text-decoration: underline;
      }

      /* Toggle Switch Style */
      .switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        margin-left: 12px;
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #334155;
        transition: .4s;
      }

      .slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .4s;
      }

      input:checked + .slider {
        background-color: var(--primary-color);
      }

      input:focus + .slider {
        box-shadow: 0 0 1px var(--primary-color);
      }

      input:checked + .slider:before {
        transform: translateX(20px);
      }

      .slider.round {
        border-radius: 24px;
      }

      .slider.round:before {
        border-radius: 50%;
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
