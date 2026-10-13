"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Checkbox, TextField } from "@/components/ui/field";
import { Badge } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/dates";

interface StaffRow {
  id: string;
  email: string;
  name: string;
  active: boolean;
  roleKeys: string[];
  lastLoginAt: string | null;
}

export function StaffManager({ staff, roles, meId }: { staff: StaffRow[]; roles: { key: string; name: string }[]; meId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", password: "", roleKeys: ["STAFF"] });
  const [busy, setBusy] = useState(false);
  const roleName = (k: string) => roles.find((r) => r.key === k)?.name ?? k;

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    try {
      await api(`/api/v1/admin/staff/${editing.id}`, { method: "PUT", body: { roleKeys: editing.roleKeys, active: editing.active } });
      toast("Zapisano uprawnienia pracownika.");
      setEditing(null);
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Błąd", "error");
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    try {
      await api("/api/v1/admin/staff", { body: { ...form, lastName: form.lastName || undefined } });
      toast("Konto pracownika utworzone. Przekaż hasło bezpiecznym kanałem.");
      setCreating(false);
      setForm({ email: "", firstName: "", lastName: "", password: "", roleKeys: ["STAFF"] });
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Błąd", "error");
    } finally {
      setBusy(false);
    }
  }
  const toggleRole = (list: string[], key: string, on: boolean) => (on ? [...new Set([...list, key])] : list.filter((k) => k !== key));

  return (
    <>
      <div className="mb-4 flex justify-end"><Button size="sm" onClick={() => setCreating(true)}>Dodaj pracownika</Button></div>
      <ul className="divide-y divide-forest-900/5">
        {staff.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium">{s.name} {s.id === meId && <span className="text-xs text-muted">(Ty)</span>}</p>
              <p className="text-xs text-muted">{s.email} · ostatnie logowanie: {s.lastLoginAt ? formatDateTime(s.lastLoginAt) : "nigdy"}</p>
            </div>
            <div className="flex items-center gap-2">
              {s.roleKeys.map((k) => <Badge key={k}>{roleName(k)}</Badge>)}
              {!s.active && <Badge tone="red">Zablokowany</Badge>}
              <Button size="sm" variant="outline" onClick={() => setEditing({ ...s })}>Edytuj</Button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={`Uprawnienia: ${editing?.name ?? ""}`} footer={<><Button variant="outline" onClick={() => setEditing(null)}>Anuluj</Button><Button loading={busy} onClick={saveEdit}>Zapisz</Button></>}>
        {editing && (
          <div className="space-y-3">
            {roles.map((r) => (
              <Checkbox key={r.key} checked={editing.roleKeys.includes(r.key)} onChange={(e) => setEditing({ ...editing, roleKeys: toggleRole(editing.roleKeys, r.key, e.target.checked) })} label={r.name} />
            ))}
            <div className="border-t border-forest-900/10 pt-3">
              <Checkbox checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} label="Konto aktywne" description="Zablokowanie natychmiast wylogowuje pracownika." />
            </div>
          </div>
        )}
      </Dialog>
      <Dialog open={creating} onClose={() => setCreating(false)} title="Nowy pracownik" footer={<><Button variant="outline" onClick={() => setCreating(false)}>Anuluj</Button><Button loading={busy} onClick={create}>Utwórz konto</Button></>}>
        <div className="space-y-3">
          <TextField label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Imię" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <TextField label="Nazwisko" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <TextField label="Hasło tymczasowe" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} hint="Min. 10 znaków, litera i cyfra." />
          <fieldset className="space-y-2">
            <legend className="label">Role</legend>
            {roles.map((r) => (
              <Checkbox key={r.key} checked={form.roleKeys.includes(r.key)} onChange={(e) => setForm({ ...form, roleKeys: toggleRole(form.roleKeys, r.key, e.target.checked) })} label={r.name} />
            ))}
          </fieldset>
        </div>
      </Dialog>
    </>
  );
}

export function RoleMatrix({ roles, permissions }: { roles: { id: string; key: string; name: string; description: string; permissions: string[]; users: number }[]; permissions: { key: string; label: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState(() => Object.fromEntries(roles.map((r) => [r.id, r.permissions])));
  const [saving, setSaving] = useState<string | null>(null);
  const dirty = (id: string) => {
    const orig = roles.find((r) => r.id === id)!.permissions;
    const cur = state[id]!;
    return orig.length !== cur.length || orig.some((p) => !cur.includes(p));
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-forest-900/10">
            <th className="py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">Uprawnienie</th>
            {roles.map((r) => (
              <th key={r.id} className="px-3 py-2 text-center">
                <span className="block font-semibold">{r.name}</span>
                <span className="text-xs font-normal text-muted">{r.users} os.</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => (
            <tr key={p.key} className="border-b border-forest-900/5">
              <td className="py-2 pr-4">{p.label}<span className="block font-mono text-[11px] text-muted">{p.key}</span></td>
              {roles.map((r) => {
                const on = state[r.id]!.includes(p.key);
                const locked = r.key === "ADMIN" && p.key === "roles.manage";
                return (
                  <td key={r.id} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="size-4 accent-forest-700"
                      checked={on}
                      disabled={locked}
                      aria-label={`${r.name}: ${p.label}`}
                      onChange={(e) => setState((s) => ({ ...s, [r.id]: e.target.checked ? [...s[r.id]!, p.key] : s[r.id]!.filter((x) => x !== p.key) }))}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td />
            {roles.map((r) => (
              <td key={r.id} className="px-3 py-3 text-center">
                <Button
                  size="sm"
                  variant={dirty(r.id) ? "primary" : "outline"}
                  disabled={!dirty(r.id)}
                  loading={saving === r.id}
                  onClick={async () => {
                    setSaving(r.id);
                    try {
                      await api(`/api/v1/admin/roles/${r.id}`, { method: "PUT", body: { permissions: state[r.id] } });
                      toast(`Zapisano uprawnienia roli ${r.name}.`);
                      router.refresh();
                    } catch (e) {
                      toast(e instanceof ApiError ? e.message : "Błąd", "error");
                    } finally {
                      setSaving(null);
                    }
                  }}
                >
                  Zapisz
                </Button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
