type AnalyticsEvent = 
  | { type: "auth_login"; userId: string }
  | { type: "project_create"; projectId: string; userId: string }
  | { type: "task_create"; projectId: string; taskId: string; userId: string }
  | { type: "task_update"; projectId: string; taskId: string; userId: string; field: string }
  | { type: "task_move"; projectId: string; taskId: string; userId: string; fromColumn: string; toColumn: string }
  | { type: "comment_create"; projectId: string; taskId: string; commentId: string; userId: string }
  | { type: "notify_view"; userId: string; notificationId: string };

/**
 * Track an analytics event
 * Currently logs to console, can be extended to send to analytics service
 */
export function trackEvent(event: AnalyticsEvent) {
  // In production, this would send to an analytics service (GA, Mixpanel, etc.)
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", event);
  }
  
  // Future: Send to analytics backend
  // Example: window.gtag?.('event', event.type, { ...event });
}

/**
 * Track page view
 */
export function trackPageView(path: string, userId?: string) {
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics] Page view:", path, userId ? `(User: ${userId})` : "");
  }
  
  // Future: window.gtag?.('config', GA_ID, { page_path: path, user_id: userId });
}
