import type { SessionSummary } from "../types/core.js";

export class SessionSummaryUI {
	private container: HTMLElement;
	private modal: HTMLElement;

	constructor(container: HTMLElement) {
		this.container = container;
		this.modal = this.createModal();
		this.container.appendChild(this.modal);
	}

	private createModal(): HTMLElement {
		const modal = document.createElement("div");
		modal.className = "session-summary-modal";

		const content = document.createElement("div");
		content.className = "session-summary-content";

		modal.appendChild(content);

		return modal;
	}

	public show(summary: SessionSummary): void {
		const content = this.modal.querySelector(".session-summary-content");
		if (!content) return;

		const topicsHtml =
			summary.topics.length > 0
				? `<div class="session-summary-section">
                <h3>Topics</h3>
                <div class="topic-tags">
                    ${summary.topics.map((t) => `<span class="topic-tag">${t.name}</span>`).join("")}
                </div>
               </div>`
				: "";

		const insightsHtml =
			summary.insights.length > 0
				? `<div class="session-summary-section">
                <h3>Insights</h3>
                <ul class="insight-list">
                    ${summary.insights
											.map(
												(i) => `
                        <li class="insight-item">
                            <span class="insight-icon">${this.getInsightIcon(i.type)}</span>
                            <span class="insight-text">${i.content}</span>
                        </li>
                    `,
											)
											.join("")}
                </ul>
               </div>`
				: "";

		content.innerHTML = `
            <h2>Session Summary</h2>
            <div class="session-summary-section">
                <div class="overall-summary">${summary.overallSummary}</div>
            </div>
            ${topicsHtml}
            ${insightsHtml}
            <div class="session-id-display">ID: ${summary.sessionId}</div>
            <button class="close-summary-btn">Close</button>
        `;

		const closeBtn = content.querySelector(".close-summary-btn");
		closeBtn?.addEventListener("click", () => this.hide());

		this.modal.classList.add("active");
	}

	public hide(): void {
		this.modal.classList.remove("active");
	}

	private getInsightIcon(type: string): string {
		switch (type) {
			case "key_point":
				return "💡";
			case "suggestion":
				return "✨";
			case "question":
				return "❓";
			case "sentiment":
				return "🎭";
			default:
				return "📝";
		}
	}
}
