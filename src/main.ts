// Main entry point for MONOLOG LIVE

import { IndexedDBWrapper } from './storage/indexeddb-wrapper.js';

class MonologLive {
  private storage: IndexedDBWrapper;

  constructor() {
    this.storage = new IndexedDBWrapper();
  }

  async initialize(): Promise<void> {
    try {
      await this.storage.initialize();
      this.updateStatus('System ready - Core interfaces loaded', 'ready');
      console.log('MONOLOG LIVE initialized successfully');
    } catch (error) {
      this.updateStatus(`Initialization failed: ${error}`, 'error');
      console.error('Failed to initialize MONOLOG LIVE:', error);
    }
  }

  private updateStatus(message: string, type: 'ready' | 'error'): void {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = type;
    }
  }
}

// Initialize the application
const app = new MonologLive();
app.initialize();