// Real-time transcription display component

export interface TranscriptionDisplayConfig {
  maxLines: number;
  autoScroll: boolean;
  showTimestamps: boolean;
  interimTextClass: string;
  finalTextClass: string;
}

export interface TranscriptSegment {
  text: string;
  isFinal: boolean;
  timestamp: Date;
  id: string;
}

export class TranscriptionDisplay {
  private container: HTMLElement;
  private config: TranscriptionDisplayConfig;
  private segments: TranscriptSegment[] = [];
  private currentInterimId: string | null = null;

  constructor(container: HTMLElement, config: Partial<TranscriptionDisplayConfig> = {}) {
    this.container = container;
    this.config = {
      maxLines: 50,
      autoScroll: true,
      showTimestamps: false,
      interimTextClass: 'transcript-interim',
      finalTextClass: 'transcript-final',
      ...config
    };

    this.initializeContainer();
  }

  private initializeContainer(): void {
    this.container.className = 'transcription-display';
    this.container.innerHTML = `
      <div class="transcript-content" role="log" aria-live="polite" aria-label="Live transcription">
        <div class="transcript-placeholder">Start speaking to see transcription...</div>
      </div>
    `;
  }

  addTranscript(text: string, isFinal: boolean): void {
    if (!text.trim()) return;

    const now = new Date();
    
    if (isFinal) {
      // Handle final transcript
      if (this.currentInterimId) {
        // Update existing interim segment to final
        const existingSegment = this.segments.find(s => s.id === this.currentInterimId);
        if (existingSegment) {
          existingSegment.text = text;
          existingSegment.isFinal = true;
          existingSegment.timestamp = now;
        }
        this.currentInterimId = null;
      } else {
        // Add new final segment
        const segment: TranscriptSegment = {
          text,
          isFinal: true,
          timestamp: now,
          id: this.generateId()
        };
        this.segments.push(segment);
      }
    } else {
      // Handle interim transcript
      if (this.currentInterimId) {
        // Update existing interim segment
        const existingSegment = this.segments.find(s => s.id === this.currentInterimId);
        if (existingSegment) {
          existingSegment.text = text;
          existingSegment.timestamp = now;
        }
      } else {
        // Add new interim segment
        const segment: TranscriptSegment = {
          text,
          isFinal: false,
          timestamp: now,
          id: this.generateId()
        };
        this.segments.push(segment);
        this.currentInterimId = segment.id;
      }
    }

    this.trimSegments();
    this.render();
  }

  private trimSegments(): void {
    if (this.segments.length > this.config.maxLines) {
      // Keep only final segments when trimming, preserve current interim
      const finalSegments = this.segments.filter(s => s.isFinal);
      const interimSegments = this.segments.filter(s => !s.isFinal);
      
      if (finalSegments.length > this.config.maxLines - 1) {
        const keepCount = this.config.maxLines - interimSegments.length;
        this.segments = [
          ...finalSegments.slice(-keepCount),
          ...interimSegments
        ];
      }
    }
  }

  private render(): void {
    const contentDiv = this.container.querySelector('.transcript-content') as HTMLElement;
    if (!contentDiv) return;

    // Remove placeholder if we have segments
    const placeholder = contentDiv.querySelector('.transcript-placeholder');
    if (placeholder && this.segments.length > 0) {
      placeholder.remove();
    }

    // Clear and rebuild content
    const segmentElements = contentDiv.querySelectorAll('.transcript-segment');
    segmentElements.forEach(el => el.remove());

    this.segments.forEach(segment => {
      const segmentEl = this.createSegmentElement(segment);
      contentDiv.appendChild(segmentEl);
    });

    if (this.config.autoScroll) {
      this.scrollToBottom();
    }
  }

  private createSegmentElement(segment: TranscriptSegment): HTMLElement {
    const segmentEl = document.createElement('div');
    segmentEl.className = `transcript-segment ${segment.isFinal ? this.config.finalTextClass : this.config.interimTextClass}`;
    segmentEl.setAttribute('data-segment-id', segment.id);

    const textEl = document.createElement('span');
    textEl.className = 'transcript-text';
    textEl.textContent = segment.text;

    segmentEl.appendChild(textEl);

    if (this.config.showTimestamps) {
      const timestampEl = document.createElement('span');
      timestampEl.className = 'transcript-timestamp';
      timestampEl.textContent = this.formatTimestamp(segment.timestamp);
      segmentEl.appendChild(timestampEl);
    }

    return segmentEl;
  }

  private formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }

  private generateId(): string {
    return `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  clear(): void {
    this.segments = [];
    this.currentInterimId = null;
    const contentDiv = this.container.querySelector('.transcript-content') as HTMLElement;
    if (contentDiv) {
      contentDiv.innerHTML = '<div class="transcript-placeholder">Start speaking to see transcription...</div>';
    }
  }

  getTranscriptText(): string {
    return this.segments
      .filter(s => s.isFinal)
      .map(s => s.text)
      .join(' ');
  }

  getSegments(): TranscriptSegment[] {
    return [...this.segments];
  }

  setConfig(newConfig: Partial<TranscriptionDisplayConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.render();
  }
}