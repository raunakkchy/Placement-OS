import { useState, useEffect } from "react";

/**
 * Calculates time-based greeting using local device/browser time:
 * 05:00–11:59 → Good morning
 * 12:00–16:59 → Good afternoon
 * 17:00–20:59 → Good evening
 * 21:00–04:59 → Good night
 */
export function getTimeBasedGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }
  if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  }
  if (hour >= 17 && hour < 21) {
    return "Good evening";
  }
  return "Good night";
}

/**
 * Hook that provides a dynamic time-based greeting and updates automatically
 * across time boundaries without unnecessary re-renders.
 */
export function useTimeBasedGreeting(): string {
  const [greeting, setGreeting] = useState<string>(() => getTimeBasedGreeting());

  useEffect(() => {
    const updateGreeting = () => {
      const next = getTimeBasedGreeting();
      setGreeting((prev) => (prev !== next ? next : prev));
    };

    // Check periodically (every 30 seconds) to update across boundaries
    const interval = setInterval(updateGreeting, 30000);
    return () => clearInterval(interval);
  }, []);

  return greeting;
}

/**
 * Calculates human-readable relative time from an actual Date/ISO timestamp.
 * Returns: "Just now", "5 min ago", "2 hours ago", "Yesterday", "3 days ago", etc.
 * If timestamp is missing or invalid, returns "Recently".
 */
export function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "Recently";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // If timestamp is slightly in the future or under 60 seconds
  if (diffMs < 60 * 1000) {
    return "Just now";
  }

  const diffMins = Math.floor(diffMs / (60 * 1000));
  if (diffMins < 60) {
    return diffMins === 1 ? "1 min ago" : `${diffMins} min ago`;
  }

  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  const months = Math.floor(diffDays / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
