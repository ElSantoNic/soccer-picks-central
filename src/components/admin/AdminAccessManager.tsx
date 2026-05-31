import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";

interface AdminRow {
  user_id: string;
  email: string | null;
  created_at: string;
}

const AdminAccessManager = () => {
  const [identifier, setIdentifier] = useState("");
  const [granting, setGranting] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-access", {
      body: { action: "list" },
    });
    if (error || (data as any)?.error) {
      toast.error("Failed to load admins");
    } else {
      setAdmins((data as any).admins ?? []);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const grant = async () => {
    const id = identifier.trim();
    if (!id) return;
    setGranting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-access", {
      body: { action: "grant", identifier: id },
    });
    setGranting(false);
    if (error || (data as any)?.error) {
      toast.error("Could not grant access");
      return;
    }
    toast.success("Admin access granted", { description: (data as any).email ?? (data as any).user_id });
    setIdentifier("");
    fetchList();
  };

  const revoke = async (row: AdminRow) => {
    if (row.user_id === currentUserId) {
      toast.error("You cannot revoke your own access");
      return;
    }
    if (!confirm(`Revoke admin access for ${row.email ?? row.user_id}?`)) return;
    setRevokingId(row.user_id);
    const { data, error } = await supabase.functions.invoke("admin-manage-access", {
      body: { action: "revoke", identifier: row.user_id },
    });
    setRevokingId(null);
    if (error || (data as any)?.error) {
      toast.error("Could not revoke access", { description: error?.message ?? (data as any)?.error });
      return;
    }
    toast.success("Admin access revoked");
    fetchList();
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 text-foreground">Manage Admin Access</h2>

      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">
          Grant access by User UID or email
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && grant()}
            placeholder="user@example.com or UUID"
            className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
            disabled={granting}
          />
          <button
            onClick={grant}
            disabled={granting || !identifier.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Grant
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Current admins</h3>
          <span className="text-xs text-muted-foreground">{admins.length} total</span>
        </div>
        {loadingList ? (
          <div className="p-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : admins.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No admins yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {admins.map((row) => {
              const isSelf = row.user_id === currentUserId;
              return (
                <li key={row.user_id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {row.email ?? "(no email)"} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{row.user_id}</div>
                  </div>
                  <button
                    onClick={() => revoke(row)}
                    disabled={isSelf || revokingId === row.user_id}
                    className="px-3 py-1.5 text-xs font-medium border border-border rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {revokingId === row.user_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Revoke
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminAccessManager;
