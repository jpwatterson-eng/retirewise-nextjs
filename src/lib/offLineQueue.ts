// lib/offlineQueue.ts
type QueuedOperation = {
  id: string;
  type: 'timeLog' | 'journal' | 'update';
  data: any;
  timestamp: string;
  retries: number;
};

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private processing = false;

  constructor() {
    // Load queue from localStorage on init
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('offlineQueue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    }
  }

  add(operation: Omit<QueuedOperation, 'id' | 'retries'>) {
    const queued: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      retries: 0,
    };
    
    this.queue.push(queued);
    this.persist();
    
    // Try to process immediately if online
    if (navigator.onLine) {
      this.process();
    }
  }

  private persist() {
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }

  async process() {
    if (this.processing || !navigator.onLine) return;
    
    this.processing = true;
    
    while (this.queue.length > 0 && navigator.onLine) {
      const operation = this.queue[0];
      
      try {
        await this.executeOperation(operation);
        this.queue.shift(); // Remove on success
        this.persist();
      } catch (error) {
        console.error('Failed to execute operation:', error);
        operation.retries++;
        
        if (operation.retries >= 3) {
          // Give up after 3 retries
          console.error('Max retries reached, removing operation:', operation);
          this.queue.shift();
        }
        
        this.persist();
        break; // Stop processing on error
      }
    }
    
    this.processing = false;
  }

  private async executeOperation(operation: QueuedOperation) {
    switch (operation.type) {
      case 'timeLog':
        const response = await fetch('/api/timeLogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.data),
        });
        if (!response.ok) throw new Error('Failed to sync time log');
        break;
      
      case 'journal':
        const journalResponse = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.data),
        });
        if (!journalResponse.ok) throw new Error('Failed to sync journal');
        break;
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  getQueueSize() {
    return this.queue.length;
  }

  clearQueue() {
    this.queue = [];
    this.persist();
  }
}

export const offlineQueue = new OfflineQueue();

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online, processing queue...');
    offlineQueue.process();
  });
  
  window.addEventListener('offline', () => {
    console.log('Gone offline, queueing operations...');
  });
}