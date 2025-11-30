"use client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, limit, startAfter, type DocumentSnapshot } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import { markNotificationRead, type Notification } from "@/lib/notifications";
import Link from "next/link";
import { listenProjectsForUser, type Project } from "@/lib/projects";

const NOTIFICATIONS_PER_PAGE = 20;

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<(Notification & { projectName?: string })[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Listen to user's projects
  useEffect(() => {
    if (!user) return;
    const unsub = listenProjectsForUser(user.uid, setProjects);
    return () => unsub();
  }, [user]);

  // Listen to all notifications across all projects
  useEffect(() => {
    if (!user || projects.length === 0) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const db = getDbClient();
    const allNotifications: (Notification & { projectName?: string })[] = [];
    const unsubscribers: (() => void)[] = [];

    projects.forEach((project) => {
      const notifQuery = query(
        collection(db, `projects/${project.projectId}/notifications`),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(NOTIFICATIONS_PER_PAGE)
      );

      const unsub = onSnapshot(notifQuery, (snapshot) => {
        // Remove old notifications from this project
        const filtered = allNotifications.filter((n) => n.projectId !== project.projectId);

        // Add new notifications from this project
        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<Notification, "notificationId">;
          filtered.push({
            notificationId: doc.id,
            ...data,
            projectName: project.name,
          });
        });

        // Sort all notifications by createdAt
        filtered.sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });

        setNotifications(filtered);
        setLoading(false);
      });

      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [user, projects]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) => markNotificationRead(n.projectId, n.notificationId))
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nb-bg)' }}>
        <p style={{ color: 'var(--nb-ink)' }}>Please sign in to view notifications</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 sm:p-8" style={{ backgroundColor: 'var(--nb-bg)' }} role="main">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight nb-brand-text mb-2">
            Notifications
          </h1>
          <p style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
            Stay updated on all your projects
          </p>
        </div>

        {/* Filter and Actions Bar */}
        <div className="nb-card-elevated rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "all"
                  ? "nb-btn-primary"
                  : "nb-btn-secondary hover:bg-white/5"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "unread"
                  ? "nb-btn-primary"
                  : "nb-btn-secondary hover:bg-white/5"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm hover:underline"
              style={{ color: 'var(--nb-teal)' }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="nb-card-elevated rounded-xl p-8 text-center">
            <p style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
              Loading notifications...
            </p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="nb-card-elevated rounded-xl p-8 text-center">
            <svg
              className="h-16 w-16 mx-auto mb-4"
              style={{ color: 'color-mix(in srgb, var(--nb-ink) 30%, transparent)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p className="text-lg font-medium mb-2" style={{ color: 'var(--nb-ink)' }}>
              {filter === "unread" ? "All caught up!" : "No notifications yet"}
            </p>
            <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--nb-ink) 60%, transparent)' }}>
              {filter === "unread"
                ? "You don't have any unread notifications"
                : "You'll see notifications here when you get them"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.notificationId}
                className={`nb-card-elevated rounded-xl p-4 transition-colors ${
                  !notification.read ? "border-l-4" : ""
                }`}
                style={
                  !notification.read
                    ? {
                        borderLeftColor: 'var(--nb-teal)',
                        backgroundColor: 'color-mix(in srgb, var(--nb-teal) 5%, transparent)',
                      }
                    : {}
                }
              >
                <div className="flex items-start gap-4">
                  {/* Notification Icon */}
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor:
                        notification.type === "mention"
                          ? 'color-mix(in srgb, var(--nb-accent) 20%, transparent)'
                          : notification.type === "assignment"
                          ? 'color-mix(in srgb, var(--nb-teal) 20%, transparent)'
                          : 'color-mix(in srgb, var(--nb-ink) 20%, transparent)',
                    }}
                  >
                    {notification.type === "mention" && (
                      <svg className="h-5 w-5" style={{ color: 'var(--nb-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    )}
                    {notification.type === "assignment" && (
                      <svg className="h-5 w-5" style={{ color: 'var(--nb-teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                    {notification.type === "comment" && (
                      <svg className="h-5 w-5" style={{ color: 'var(--nb-ink)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}
                    {notification.type === "status-change" && (
                      <svg className="h-5 w-5" style={{ color: 'var(--nb-ink)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    )}
                    {notification.type === "system" && (
                      <svg className="h-5 w-5" style={{ color: 'var(--nb-ink)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--nb-ink)' }}>
                        {notification.title || (notification.type === "mention" ? "You were mentioned" : "Notification")}
                      </h3>
                      {notification.createdAt && (
                        <span className="text-xs whitespace-nowrap" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
                          {new Date(notification.createdAt.toMillis()).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    {notification.text && (
                      <p className="text-sm mb-2 line-clamp-2" style={{ color: 'color-mix(in srgb, var(--nb-ink) 70%, transparent)' }}>
                        {notification.text}
                      </p>
                    )}

                    {notification.projectName && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 rounded nb-chip-teal">
                          {notification.projectName}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2">
                      {!notification.read && (
                        <button
                          onClick={() => markNotificationRead(notification.projectId, notification.notificationId)}
                          className="text-xs hover:underline"
                          style={{ color: 'var(--nb-teal)' }}
                        >
                          Mark as read
                        </button>
                      )}
                      {notification.taskId && (
                        <Link
                          href={`/boards/${notification.projectId}?task=${notification.taskId}`}
                          className="text-xs hover:underline"
                          style={{ color: 'var(--nb-teal)' }}
                        >
                          View task
                        </Link>
                      )}
                      {!notification.taskId && (
                        <Link
                          href={`/boards/${notification.projectId}`}
                          className="text-xs hover:underline"
                          style={{ color: 'var(--nb-teal)' }}
                        >
                          View board
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
