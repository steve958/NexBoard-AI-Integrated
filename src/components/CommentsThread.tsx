"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { addComment, deleteComment, listenComments, updateComment, type Comment } from "@/lib/comments";
import { serverTimestamp } from "firebase/firestore";
import { useToast } from "@/components/ToastProvider";

export default function CommentsThread({
  projectId,
  taskId,
  currentUserId,
  ownerId,
  members = [],
  taskAssigneeId,
  taskTitle,
}: {
  projectId: string;
  taskId: string;
  currentUserId: string;
  ownerId: string;
  members?: { uid: string; name?: string; email?: string }[];
  taskAssigneeId?: string;
  taskTitle?: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { addToast } = useToast();
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Mentions state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [selIdx, setSelIdx] = useState(0);

  useEffect(() => {
    if (!projectId || !taskId) return;
    const off = listenComments(projectId, taskId, setComments);
    return () => off();
  }, [projectId, taskId]);

  const canDelete = (authorId: string) => currentUserId === authorId || currentUserId === ownerId;

  const suggestions = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    const list = members;
    if (!showMentions) return [] as typeof members;
    if (!q) return list.slice(0, 8);
    return list.filter((m) => (m.name || m.email || m.uid).toLowerCase().includes(q)).slice(0, 8);
  }, [mentionQuery, members, showMentions]);

  function computeMentionState(nextText: string) {
    const el = taRef.current;
    if (!el) return setShowMentions(false);
    const caret = el.selectionStart ?? nextText.length;
    const before = nextText.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at === -1) { setShowMentions(false); return; }
    const afterAt = before.slice(at + 1);
    // Only show if no whitespace between @ and caret, and start is BOS or whitespace/newline
    const prevCh = at === 0 ? " " : before[at - 1];
    if (/\s/.test(prevCh) && !/\s/.test(afterAt)) {
      setShowMentions(true);
      setMentionStart(at);
      setMentionQuery(afterAt);
      setSelIdx(0);
    } else {
      setShowMentions(false);
    }
  }

  function insertMention(member: { uid: string; name?: string; email?: string }) {
    const el = taRef.current;
    if (!el || mentionStart == null) return;
    const caret = el.selectionStart ?? text.length;
    const display = member.name || member.email || member.uid;
    const before = text.slice(0, mentionStart);
    const after = text.slice(caret);
    const inserted = `@${display} `;
    const next = `${before}${inserted}${after}`;
    setText(next);
    setShowMentions(false);
    // Restore caret after inserted mention asynchronously
    requestAnimationFrame(() => {
      if (!taRef.current) return;
      const pos = (before + inserted).length;
      taRef.current.selectionStart = taRef.current.selectionEnd = pos;
      taRef.current.focus();
    });
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="nb-card rounded-md p-2">
        <div className="relative">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => { setText(e.target.value); computeMentionState(e.target.value); }}
            onKeyDown={async (e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                const t = text.trim();
                if (!t) return;
                try {
                  await addComment(projectId, taskId, currentUserId, t);
                  const { addNotification } = await import("@/lib/notifications");
                  
                  // Mentions notifications
                  const hits = Array.from(t.matchAll(/@(\S+)/g)).map((m) => m[1].toLowerCase());
                  const targets = members.filter((m) => hits.includes((m.name || m.email || m.uid).toLowerCase()) && m.uid !== currentUserId);
                  if (targets.length) {
                    await Promise.all(targets.map((m)=> addNotification(projectId, {
                      userId: m.uid,
                      taskId,
                      type: "mention",
                      title: `Mentioned in a comment`,
                      text: t.slice(0, 280),
                    })));
                  }
                  
                  // Notify assignee of new comment
                  if (taskAssigneeId && taskAssigneeId !== currentUserId && !targets.some(m => m.uid === taskAssigneeId)) {
                    await addNotification(projectId, {
                      userId: taskAssigneeId,
                      taskId,
                      type: "comment",
                      title: "New comment on your task",
                      text: `${taskTitle ? `On "${taskTitle}": ` : ""}${t.slice(0, 200)}`,
                    });
                  }
                  
                  setText("");
                  addToast({ title: "Comment added", kind: "success" });
                } catch {
                  addToast({ title: "Failed to add comment", kind: "error" });
                }
              } else if (showMentions) {
                if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx((i) => Math.min(i + 1, Math.max(0, suggestions.length - 1))); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx((i) => Math.max(i - 1, 0)); }
                else if (e.key === "Enter") { e.preventDefault(); const pick = suggestions[selIdx]; if (pick) insertMention(pick); }
                else if (e.key === "Escape") { setShowMentions(false); }
              }
            }}
            placeholder="Write a comment… Type @ to mention (Ctrl+Enter to send)"
            rows={3}
            className="w-full bg-transparent border border-white/10 rounded p-2"
          />
          {showMentions && suggestions.length > 0 && (
            <ul role="listbox" className="absolute left-2 top-full mt-1 w-64 max-h-48 overflow-auto rounded-md nb-card border border-white/10 z-10">
              {suggestions.map((m, i) => (
                <li key={m.uid}>
                  <button
                    role="option"
                    aria-selected={i === selIdx}
                    onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                    className={`w-full text-left px-2 py-1 text-sm ${i === selIdx ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    {m.name || m.email || m.uid}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <ul className="space-y-2">
        {comments.map((c) => {
          const isOwner = currentUserId === ownerId;
          const isAuthor = currentUserId === c.authorId;
          const isHidden = !!c.hidden;
          const canSeeContent = isOwner || !isHidden;
          const author = members.find(m => m.uid === c.authorId);
          const authorName = author?.name || author?.email || 'Unknown';
          const isEditing = editingId === c.commentId;
          
          return (
            <li key={c.commentId} className={`nb-card rounded-md p-3 ${isHidden ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-xs opacity-70">{authorName}</div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAuthor && !isEditing && (
                    <button
                      onClick={() => { setEditingId(c.commentId); setEditText(c.text); }}
                      className="text-xs opacity-70 hover:opacity-100"
                    >
                      Edit
                    </button>
                  )}
                  {isOwner && (
                    isHidden ? (
                      <button
                        onClick={async () => { try { await updateComment(projectId, c.commentId, { hidden: false }); addToast({ title: "Comment restored", kind: "success" }); } catch { addToast({ title: "Restore failed", kind: "error" }); } }}
                        className="text-xs opacity-70 hover:opacity-100"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={async () => { try { await updateComment(projectId, c.commentId, { hidden: true, moderatedBy: currentUserId, moderatedAt: serverTimestamp() }); addToast({ title: "Comment hidden", kind: "success" }); } catch { addToast({ title: "Hide failed", kind: "error" }); } }}
                        className="text-xs opacity-70 hover:opacity-100"
                      >
                        Hide
                      </button>
                    )
                  )}
                  {canDelete(c.authorId) && (
                    <button
                      onClick={async () => { try { await deleteComment(projectId, c.commentId); addToast({ title: "Comment deleted", kind: "success" }); } catch { addToast({ title: "Delete failed", kind: "error" }); } }}
                      className="text-xs opacity-70 hover:opacity-100"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full bg-transparent border border-white/10 rounded p-2 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await updateComment(projectId, c.commentId, { text: editText, editedAt: serverTimestamp() });
                          setEditingId(null);
                          addToast({ title: "Comment updated", kind: "success" });
                        } catch {
                          addToast({ title: "Update failed", kind: "error" });
                        }
                      }}
                      className="text-xs px-2 py-1 rounded nb-btn-primary"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs px-2 py-1 rounded nb-btn-secondary hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm whitespace-pre-wrap">
                    {canSeeContent ? c.text : <span className="italic opacity-80">Comment hidden by moderator</span>}
                  </div>
                  {c.editedAt && <div className="text-[10px] opacity-60 mt-1">edited</div>}
                </div>
              )}
            </li>
          );
        })}
        {comments.length === 0 && <li className="text-xs opacity-70">No comments yet</li>}
      </ul>
    </div>
  );
}
