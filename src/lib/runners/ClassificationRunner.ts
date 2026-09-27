import { Email } from "@/components/EmailDetailPane";

export type ClassificationState = {
  isClassifying: boolean;
  classifiedCount: number;
  totalTimeMs: number;
  totalCost: number;
};

type Listener<T> = (state: T) => void;

export class ClassificationRunner {
  private state: ClassificationState = {
    isClassifying: false,
    classifiedCount: 0,
    totalTimeMs: 0,
    totalCost: 0,
  };
  
  private listeners: Set<Listener<ClassificationState>> = new Set();
  private abortController: AbortController | null = null;
  private getEmails: () => Email[];
  private onEmailClassified: (index: number, classification: any) => void;
  private isEmailsLoading: () => boolean;

  constructor(
    getEmails: () => Email[], 
    isEmailsLoading: () => boolean,
    onEmailClassified: (index: number, classification: any) => void
  ) {
    this.getEmails = getEmails;
    this.isEmailsLoading = isEmailsLoading;
    this.onEmailClassified = onEmailClassified;
  }

  public subscribe(listener: Listener<ClassificationState>) {
    this.listeners.add(listener);
    // Return initial state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public getState() {
    return this.state;
  }

  private updateState(partial: Partial<ClassificationState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(l => l(this.state));
  }

  public async start(runForAll: boolean = false) {
    if (this.state.isClassifying) return;
    this.updateState({
      isClassifying: true,
      classifiedCount: 0,
      totalTimeMs: 0,
      totalCost: 0
    });

    this.abortController = new AbortController();
    const startTime = Date.now();
    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    let currentClassifiedCount = 0;
    let currentTotalCost = 0;
    
    const BATCH_SIZE = 5;
    let i = 0;

    while (!this.abortController.signal.aborted) {
      const currentEmails = this.getEmails();

      if (i >= currentEmails.length) {
        if (this.isEmailsLoading()) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        } else {
          break;
        }
      }

      const batch = currentEmails.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (email, batchIndex) => {
        const actualIndex = i + batchIndex;
        
        if (!runForAll && email.classification) {
          return { success: true, cost: 0 };
        }

        let retries = 0;
        const maxRetries = 5;
        let delay = 2000;

        while (retries <= maxRetries) {
          try {
            const res = await fetch("/api/classify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, runId, force: runForAll }),
              signal: this.abortController?.signal,
            });

            if (res.ok) {
              const classification = await res.json();
              this.onEmailClassified(actualIndex, classification);
              return { success: true, cost: classification.cost || 0 };
            }

            if (res.status === 429 || res.status === 529) {
              if (retries === maxRetries) break;
              
              console.warn(`Classification rate limited. Retrying email ${email.id} in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              retries++;
              delay *= 2;
              continue;
            }
            break;
          } catch (e: any) {
            if (e.name === "AbortError") {
               return { success: false, cost: 0 };
            }
            console.error("Failed to classify email", email.id, e);
            break;
          }
        }

        return { success: false, cost: 0 };
      });

      const results = await Promise.all(batchPromises);
      
      let batchSuccess = 0;
      let batchCost = 0;
      results.forEach(r => {
        if (r.success) {
          batchSuccess++;
          batchCost += r.cost;
        }
      });
      
      currentClassifiedCount += batchSuccess;
      currentTotalCost += batchCost;
      
      this.updateState({
        classifiedCount: currentClassifiedCount,
        totalCost: currentTotalCost,
        totalTimeMs: Date.now() - startTime
      });

      i += BATCH_SIZE;
    }

    this.updateState({ isClassifying: false });
  }

  public stop() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.updateState({ isClassifying: false });
  }
}
