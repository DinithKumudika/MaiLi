import { Email } from "@/components/EmailDetailPane";

export type InboxSyncState = {
  emails: Email[];
  loadingEmails: boolean;
  isInitialSyncCompleted: boolean;
  totalInboxEmails: number;
  isRateLimited: boolean;
};

type Listener<T> = (state: T) => void;

export class InboxSyncRunner {
  private state: InboxSyncState = {
    emails: [],
    loadingEmails: false,
    isInitialSyncCompleted: false,
    totalInboxEmails: 0,
    isRateLimited: false,
  };
  
  private listeners: Set<Listener<InboxSyncState>> = new Set();
  private authErrorListeners: Set<() => void> = new Set();
  private active = false;
  private currentToken: string | null = null;
  private fetchedCount = 0;

  public subscribe(listener: Listener<InboxSyncState>) {
    this.listeners.add(listener);
    // Return initial state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public onAuthError(listener: () => void) {
    this.authErrorListeners.add(listener);
    return () => this.authErrorListeners.delete(listener);
  }

  public getState() {
    return this.state;
  }

  private updateState(partial: Partial<InboxSyncState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(l => l(this.state));
  }

  private notifyAuthError() {
    this.authErrorListeners.forEach(l => l());
  }

  public start() {
    if (this.active) return;
    this.active = true;
    this.run();
  }

  public pause() {
    this.active = false;
  }
  
  // Expose setEmails to allow external updates (like classifications)
  public setEmails(updater: (prev: Email[]) => Email[]) {
    const newEmails = updater(this.state.emails);
    this.updateState({ emails: newEmails });
  }

  private async run() {
    try {
      const countRes = await fetch("/api/emails?countOnly=true");
      if (countRes.ok) {
        const { total } = await countRes.json();
        if (this.active) this.updateState({ totalInboxEmails: total });
      } else if (countRes.status === 401) {
        this.notifyAuthError();
        return;
      }
    } catch (e) {
      console.error("Failed to get total emails", e);
    }

    if (this.active) this.updateState({ loadingEmails: true });

    while (this.active) {
      try {
        const requestUrl = this.currentToken ? `/api/emails?pageToken=${this.currentToken}` : "/api/emails";
        const res = await fetch(requestUrl);
        
        if (res.status === 401) {
          this.notifyAuthError();
          break;
        }
        if (res.status === 429 || res.status === 403 || res.status === 500) {
          console.warn("API quota/rate limit reached or server error. Pausing fetch for 60 seconds...");
          if (this.active) this.updateState({ isRateLimited: true });
          await new Promise((resolve) => setTimeout(resolve, 60000));
          if (this.active) this.updateState({ isRateLimited: false });
          continue;
        }
        if (!res.ok) {
          console.error("API error during auto-fetch", res.status);
          break;
        }
        
        const data = await res.json();
        
        if (this.active) {
          const newEmails = [...this.state.emails, ...(data.emails || [])];
          this.fetchedCount = newEmails.length;
          
          const isCompleted = this.fetchedCount >= 200 || !data.nextPageToken;
          
          this.updateState({ 
            emails: newEmails,
            isInitialSyncCompleted: this.state.isInitialSyncCompleted || isCompleted
          });
        }
        
        if (!data.nextPageToken) {
          this.currentToken = null;
          break;
        }
        this.currentToken = data.nextPageToken || null;
      } catch (e) {
        console.error("Fetch loop failed", e);
        break;
      }
    }
    
    if (this.active) {
      this.updateState({
        isInitialSyncCompleted: true,
        loadingEmails: false
      });
    }
  }
}

// Global instance for singleton-like behavior inside the context
export const inboxSyncRunner = new InboxSyncRunner();
