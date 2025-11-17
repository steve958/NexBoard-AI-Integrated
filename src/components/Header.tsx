"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { listenNotificationsForUser, markNotificationRead, type Notification } from "@/lib/notifications";
import { useToast } from "@/components/ToastProvider";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  const { user, signOutUser } = useAuth();
  const pathname = usePathname();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const { addToast } = useToast();
  const previousNotifsRef = useRef<Notification[]>([]);

  // Hide header on login page
  if (pathname === "/login") {
    return null;
  }

  useEffect(() => {
    // Derive projectId from URL when on /boards/[id]
    if (!pathname) return;
    const parts = pathname.split("/").filter(Boolean);
    setTimeout(() => {
      if (parts[0] === "boards" && parts[1]) setProjectId(parts[1]);
      else setProjectId(null);
    }, 0);
  }, [pathname]);

  useEffect(() => {
    if (!user || !projectId) return;
    const off = listenNotificationsForUser(projectId, user.uid, setNotifs);
    return () => off();
  }, [user, projectId]);

  // Show toast for new notifications
  useEffect(() => {
    if (previousNotifsRef.current.length === 0) {
      // First load, don't show toasts
      previousNotifsRef.current = notifs;
      return;
    }

    // Check for new notifications
    const newNotifications = notifs.filter(
      (n) => !previousNotifsRef.current.some((prev) => prev.notificationId === n.notificationId)
    );

    // Show toast for each new notification
    newNotifications.forEach((n) => {
      addToast({
        title: n.title || (n.type === "mention" ? "You were mentioned" : "New notification"),
        kind: "info",
        duration: 4000,
      });
    });

    previousNotifsRef.current = notifs;
  }, [notifs, addToast]);

  const unread = useMemo(() => notifs.filter((n) => !n.read), [notifs]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 nb-surface">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="NexBoard" width={28} height={28} className="rounded-md bg-white/5" />
          <span className="font-semibold tracking-tight nb-brand-text">NexBoard</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm relative">
          {user && <Link href="/boards" className="hover:underline">Boards</Link>}
          {user && <Link href="/my-projects" className="hover:underline">My Projects</Link>}
          {user && <Link href="/my-tasks" className="hover:underline">My Tasks</Link>}
          {user && <Link href="/settings" className="hover:underline">Settings</Link>}
          <ThemeToggle />
          {user && projectId && (
            <div className="relative">
              <button onClick={() => setOpen((o) => !o)} className="relative h-9 w-9 rounded-md hover:bg-white/5 flex items-center justify-center" aria-label="Notifications">
                <span className="material-icons">notifications</span>
                {unread.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full nb-chip-coral text-[11px] flex items-center justify-center">{Math.min(unread.length, 9)}{unread.length > 9 ? "+" : ""}</span>
                )}
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto nb-card nb-shadow rounded-xl border border-white/10 z-50">
                  <div className="px-3 py-2 text-xs opacity-70 border-b border-white/10 flex items-center justify-between">
                    <span>Notifications</span>
                    {unread.length > 0 && (
                      <button
                        onClick={async () => { await Promise.all(unread.map((n)=> markNotificationRead(projectId, n.notificationId))); }}
                        className="underline hover:opacity-100 opacity-80"
                      >Mark all as read</button>
                    )}
                  </div>
                  <ul className="divide-y divide-white/10">
                    {notifs.length === 0 && <li className="p-3 text-sm opacity-70">No notifications</li>}
                    {notifs.map((n) => (
                      <li key={n.notificationId} className={`p-3 ${!n.read ? "bg-white/5" : ""}`}>
                        <div className="text-sm font-medium">{n.title || (n.type === "mention" ? "You were mentioned" : "Notification")}</div>
                        {n.text && <div className="text-xs opacity-70 mt-1 line-clamp-3 whitespace-pre-wrap">{n.text}</div>}
                        <div className="mt-2 flex items-center gap-2">
                          {!n.read && (
                            <button onClick={() => markNotificationRead(projectId, n.notificationId)} className="text-xs underline opacity-80 hover:opacity-100">Mark as read</button>
                          )}
                          <Link href={`/boards/${projectId}${n.taskId ? `?task=${n.taskId}` : ''}`} className="text-xs underline opacity-80 hover:opacity-100">{n.taskId ? 'Open task' : 'Open board'}</Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {user ? (
            <button onClick={signOutUser} className="h-9 px-3 rounded-md nb-btn-secondary hover:bg-white/5">Sign out</button>
          ) : (
            <Link href="/login" className="h-9 px-3 rounded-md nb-btn-primary flex items-center">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
