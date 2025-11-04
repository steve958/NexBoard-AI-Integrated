"use client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { createApiToken, listenUserApiTokens, revokeApiToken, getTokenStatus } from "@/lib/apiTokens";
import type { ApiToken, TokenScope } from "@/lib/types";
import { useToast } from "@/components/ToastProvider";
import Modal from "@/components/Modal";

export default function SettingsPage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<TokenScope[]>(["tasks:read"]);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenUserApiTokens(user.uid, setTokens);
    return () => unsubscribe();
  }, [user]);

  const handleScopeToggle = (scope: TokenScope) => {
    setScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  const handleCreateToken = async () => {
    if (!user || !label.trim()) {
      addToast({ title: "Please enter a label for the token", kind: "error" });
      return;
    }

    if (scopes.length === 0) {
      addToast({ title: "Please select at least one scope", kind: "error" });
      return;
    }

    setCreating(true);
    try {
      const result = await createApiToken(user.uid, label.trim(), scopes);
      setNewToken(result.token);
      setShowTokenModal(true);
      setLabel("");
      setScopes(["tasks:read"]);
      addToast({ title: "API token created successfully", kind: "success" });
    } catch (error) {
      console.error("Failed to create token:", error);
      addToast({ title: "Failed to create token", kind: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeToken = async (tokenId: string, tokenLabel: string) => {
    if (!confirm(`Are you sure you want to revoke the token "${tokenLabel}"?`)) {
      return;
    }

    try {
      await revokeApiToken(tokenId);
      addToast({ title: "Token revoked successfully", kind: "success" });
    } catch (error) {
      console.error("Failed to revoke token:", error);
      addToast({ title: "Failed to revoke token", kind: "error" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ title: "Token copied to clipboard", kind: "success", duration: 2000 });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {/* API Tokens Section */}
        <section className="nb-card rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Personal API Tokens</h2>
          </div>

          {/* Create Token Form */}
          <div className="mb-8 p-4 rounded-lg bg-white/5 border border-white/10">
            <h3 className="text-sm font-medium mb-3 opacity-80">Create New Token</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm mb-2 opacity-80">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., CI/CD Pipeline"
                  className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/20 focus:outline-none focus:border-[var(--nb-accent)]"
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm mb-2 opacity-80">Scopes</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopes.includes("tasks:read")}
                      onChange={() => handleScopeToggle("tasks:read")}
                      className="rounded"
                      disabled={creating}
                    />
                    <span className="text-sm">tasks:read</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopes.includes("tasks:write")}
                      onChange={() => handleScopeToggle("tasks:write")}
                      className="rounded"
                      disabled={creating}
                    />
                    <span className="text-sm">tasks:write</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleCreateToken}
                disabled={creating || !label.trim() || scopes.length === 0}
                className="nb-btn-primary px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Generate Token"}
              </button>
            </div>
          </div>

          {/* Tokens List */}
          <div>
            <h3 className="text-sm font-medium mb-3 opacity-80">Your Tokens</h3>
            {tokens.length === 0 ? (
              <p className="text-sm opacity-60 text-center py-8">No API tokens yet. Create one above to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr className="text-left">
                      <th className="pb-2 pr-4 font-medium opacity-80">Label</th>
                      <th className="pb-2 pr-4 font-medium opacity-80">Scopes</th>
                      <th className="pb-2 pr-4 font-medium opacity-80">Created</th>
                      <th className="pb-2 pr-4 font-medium opacity-80">Status</th>
                      <th className="pb-2 font-medium opacity-80">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {tokens.map((token) => (
                      <tr key={token.tokenId} className={token.revokedAt ? "opacity-50" : ""}>
                        <td className="py-3 pr-4">{token.label}</td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-1 flex-wrap">
                            {token.scopes.map((scope) => (
                              <span
                                key={scope}
                                className="text-xs px-2 py-1 rounded nb-chip-teal"
                              >
                                {scope}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {token.createdAt?.toDate?.().toLocaleDateString() || "N/A"}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              getTokenStatus(token) === "Active"
                                ? "nb-chip-teal"
                                : "nb-chip-coral"
                            }`}
                          >
                            {getTokenStatus(token)}
                          </span>
                        </td>
                        <td className="py-3">
                          {getTokenStatus(token) === "Active" && (
                            <button
                              onClick={() => handleRevokeToken(token.tokenId, token.label)}
                              className="text-xs underline opacity-80 hover:opacity-100"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Warning */}
        <div className="p-4 rounded-lg bg-[var(--nb-coral)]/10 border border-[var(--nb-coral)]/20">
          <p className="text-sm opacity-90">
            <strong>⚠️ Important:</strong> API tokens grant access to your account. Keep them secure and never share them publicly.
            Revoke any tokens that may have been compromised.
          </p>
        </div>
      </div>

      {/* Show Token Once Modal */}
      {showTokenModal && newToken && (
        <Modal open={showTokenModal} onClose={() => { setShowTokenModal(false); setNewToken(null); }}>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">Your New API Token</h3>
            <p className="text-sm opacity-80 mb-4">
              Copy this token now. For security reasons, it won&apos;t be shown again.
            </p>
            <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/20 font-mono text-sm break-all">
              {newToken}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(newToken)}
                className="nb-btn-primary px-4 py-2 rounded-md font-medium"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => { setShowTokenModal(false); setNewToken(null); }}
                className="px-4 py-2 rounded-md nb-btn-secondary hover:bg-white/5"
              >
                I&apos;ve saved it
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
