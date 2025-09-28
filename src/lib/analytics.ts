import { trackServerExecution } from "@/core/functions/analytics-functions";

// Simple analytics hook to track server function executions
export function useExecutionAnalytics() {
  return () => {
    trackServerExecution().catch((error) => {
      console.warn("Failed to track server execution:", error);
    });
  };
}
