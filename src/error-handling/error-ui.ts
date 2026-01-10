// User-friendly error UI components

import { MonologError, ErrorSeverity, ErrorRecoveryStrategy } from './error-handler.js';

export class ErrorUI {
  private static instance: ErrorUI;
  private errorContainer: HTMLElement | null = null;
  private currentNotification: HTMLElement | null = null;

  private constructor() {
    this.createErrorContainer();
  }

  static getInstance(): ErrorUI {
    if (!ErrorUI.instance) {
      ErrorUI.instance = new ErrorUI();
    }
    return ErrorUI.instance;
  }

  private createErrorContainer(): void {
    // Create error notification container
    this.errorContainer = document.createElement('div');
    this.errorContainer.id = 'error-notifications';
    this.errorContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
      pointer-events: none;
    `;
    document.body.appendChild(this.errorContainer);
  }

  // Show error notification to user
  showError(error: MonologError, recovery: ErrorRecoveryStrategy): void {
    // Remove existing notification
    this.clearCurrentNotification();

    // Create notification element
    const notification = this.createNotificationElement(error, recovery);
    this.currentNotification = notification;
    this.errorContainer?.appendChild(notification);

    // Auto-hide for low severity errors
    if (error.severity === ErrorSeverity.LOW) {
      setTimeout(() => {
        this.hideNotification(notification);
      }, 5000);
    } else if (error.severity === ErrorSeverity.MEDIUM) {
      setTimeout(() => {
        this.hideNotification(notification);
      }, 10000);
    }
    // High and critical errors stay until manually dismissed
  }

  private createNotificationElement(error: MonologError, recovery: ErrorRecoveryStrategy): HTMLElement {
    const notification = document.createElement('div');
    notification.className = `error-notification severity-${error.severity}`;
    notification.style.cssText = `
      background: ${this.getSeverityColor(error.severity)};
      color: white;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;

    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    // Create notification content
    const content = document.createElement('div');
    
    // Title
    const title = document.createElement('div');
    title.style.cssText = 'font-weight: bold; margin-bottom: 8px;';
    title.textContent = this.getSeverityTitle(error.severity);
    content.appendChild(title);

    // Message
    const message = document.createElement('div');
    message.style.cssText = 'margin-bottom: 12px;';
    message.textContent = recovery.userMessage;
    content.appendChild(message);

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';

    // Retry button (if retryable)
    if (recovery.retryable) {
      const retryButton = document.createElement('button');
      retryButton.textContent = 'Retry';
      retryButton.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      `;
      retryButton.onclick = () => {
        this.hideNotification(notification);
        // Emit retry event
        window.dispatchEvent(new CustomEvent('error-retry', { detail: { error, recovery } }));
      };
      actions.appendChild(retryButton);
    }

    // Dismiss button
    const dismissButton = document.createElement('button');
    dismissButton.textContent = 'Dismiss';
    dismissButton.style.cssText = `
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    dismissButton.onclick = () => {
      this.hideNotification(notification);
    };
    actions.appendChild(dismissButton);

    content.appendChild(actions);
    notification.appendChild(content);

    return notification;
  }

  private getSeverityColor(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return '#2196F3'; // Blue
      case ErrorSeverity.MEDIUM:
        return '#FF9800'; // Orange
      case ErrorSeverity.HIGH:
        return '#F44336'; // Red
      case ErrorSeverity.CRITICAL:
        return '#9C27B0'; // Purple
      default:
        return '#757575'; // Gray
    }
  }

  private getSeverityTitle(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'Information';
      case ErrorSeverity.MEDIUM:
        return 'Warning';
      case ErrorSeverity.HIGH:
        return 'Error';
      case ErrorSeverity.CRITICAL:
        return 'Critical Error';
      default:
        return 'Notice';
    }
  }

  private hideNotification(notification: HTMLElement): void {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      if (this.currentNotification === notification) {
        this.currentNotification = null;
      }
    }, 300);
  }

  private clearCurrentNotification(): void {
    if (this.currentNotification) {
      this.hideNotification(this.currentNotification);
    }
  }

  // Show system status
  showSystemStatus(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): void {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = type;
    }
  }

  // Show loading state
  showLoading(message: string): HTMLElement {
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = 'text-align: center;';
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    `;

    const text = document.createElement('div');
    text.textContent = message;
    text.style.cssText = 'font-size: 16px;';

    // Add spinner animation
    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(spinnerStyle);

    content.appendChild(spinner);
    content.appendChild(text);
    loading.appendChild(content);
    document.body.appendChild(loading);

    return loading;
  }

  // Hide loading state
  hideLoading(loadingElement: HTMLElement): void {
    if (loadingElement.parentNode) {
      loadingElement.parentNode.removeChild(loadingElement);
    }
  }

  // Show confirmation dialog
  showConfirmation(
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText = 'OK',
    cancelText = 'Cancel'
  ): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 8px;
      max-width: 400px;
      margin: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = 'margin-bottom: 20px; font-size: 16px; line-height: 1.4;';

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';

    if (onCancel) {
      const cancelButton = document.createElement('button');
      cancelButton.textContent = cancelText;
      cancelButton.style.cssText = `
        background: #f5f5f5;
        border: 1px solid #ddd;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      `;
      cancelButton.onclick = () => {
        document.body.removeChild(overlay);
        onCancel();
      };
      actions.appendChild(cancelButton);
    }

    const confirmButton = document.createElement('button');
    confirmButton.textContent = confirmText;
    confirmButton.style.cssText = `
      background: #2196F3;
      border: 1px solid #2196F3;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    confirmButton.onclick = () => {
      document.body.removeChild(overlay);
      onConfirm();
    };
    actions.appendChild(confirmButton);

    dialog.appendChild(messageEl);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }
}

// Global error UI instance
export const errorUI = ErrorUI.getInstance();