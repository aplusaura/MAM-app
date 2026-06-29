"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shield, CheckSquare } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

interface Permission { id: number; name: string; slug: string; module: string; description?: string; }
interface Role { id: number; name: string; slug: string; description?: string; }
interface RoleWithPermissions extends Role { permissions: Permission[]; }

export default function RolesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoleWithPermissions | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);

  const { data: roles } = useQuery<Role[]>({ queryKey: ["roles"], queryFn: () => get("/roles/"), enabled: !!user?.is_superuser });
  const { data: permissions } = useQuery<Permission[]>({ queryKey: ["permissions"], queryFn: () => get("/permissions/"), enabled: !!user?.is_superuser });

  const createMutation = useMutation({
    mutationFn: () => post("/roles/", { name, slug, description: desc || undefined, permission_ids: selectedPerms }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); setCreateOpen(false); toast.success("Role created"); },
    onError: () => toast.error("Failed to create role"),
  });

  const updateMutation = useMutation({
    mutationFn: () => patch(`/roles/${editTarget?.id}`, { name, description: desc || undefined, permission_ids: selectedPerms }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); setEditTarget(null); toast.success("Role updated"); },
    onError: () => toast.error("Failed to update role"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/roles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Role deleted"); },
    onError: () => toast.error("Failed to delete role"),
  });

  if (!user?.is_superuser) {
    return <div className="p-8 text-gray-400 text-sm">Access denied — Super Admin only.</div>;
  }

  const permsByModule = (permissions ?? []).reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const openEdit = async (role: Role) => {
    const detail: RoleWithPermissions = await get(`/roles/${role.id}`);
    setEditTarget(detail);
    setName(detail.name);
    setSlug(detail.slug);
    setDesc(detail.description ?? "");
    setSelectedPerms(detail.permissions.map((p) => p.id));
  };

  const togglePerm = (id: number) => setSelectedPerms((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleModule = (perms: Permission[]) => {
    const ids = perms.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPerms.includes(id));
    setSelectedPerms((prev) => allSelected ? prev.filter((x) => !ids.includes(x)) : [...new Set([...prev, ...ids])]);
  };

  const PermissionGrid = () => (
    <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
      {Object.entries(permsByModule).map(([module, perms]) => {
        const allChecked = perms.every((p) => selectedPerms.includes(p.id));
        return (
          <div key={module}>
            <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => toggleModule(perms)}>
              <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${allChecked ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                {allChecked && <CheckSquare className="h-3 w-3 text-white" />}
              </div>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{module.replace(/_/g, " ")}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pl-6">
              {perms.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${selectedPerms.includes(p.id) ? "bg-blue-600 border-blue-600" : "border-gray-300 group-hover:border-blue-400"}`}
                    onClick={() => togglePerm(p.id)}
                  >
                    {selectedPerms.includes(p.id) && <CheckSquare className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-xs text-gray-600" onClick={() => togglePerm(p.id)}>{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <TopBar title={t("rolesAndPermissions")} />
      <main className="flex-1 p-3 sm:p-6 bg-gray-50 min-h-full">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-gray-800">Roles</h2>
            </div>
            <Button size="sm" onClick={() => { setName(""); setSlug(""); setDesc(""); setSelectedPerms([]); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />{t("addRole")}
            </Button>
          </div>

          <div className="space-y-2">
            {(roles ?? []).map((role) => (
              <div key={role.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{role.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{role.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(role)}><Pencil className="h-4 w-4 text-gray-400" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirmTarget(role)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                </div>
              </div>
            ))}
            {!roles?.length && <p className="text-sm text-gray-400 text-center py-8">No roles defined.</p>}
          </div>
        </div>
      </main>

      {/* Create Role Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("addRole")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("roleName")} *</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
              <div><Label>Slug *</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1" placeholder="e.g. team_leader" /></div>
            </div>
            <div><Label>{t("description")}</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1" /></div>
            <div><Label className="mb-2 block">{t("permissions")}</Label><PermissionGrid /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("cancel")}</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!name || !slug || createMutation.isPending}>{t("create")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Role: {editTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t("roleName")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
            <div><Label>{t("description")}</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1" /></div>
            <div><Label className="mb-2 block">{t("permissions")}</Label><PermissionGrid /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditTarget(null)}>{t("cancel")}</Button>
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>{t("save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(v) => !v && setConfirmTarget(null)}
        title={`${t("delete")} ${t("role")}`}
        description={`Delete role "${confirmTarget?.name}"? This cannot be undone.`}
        onConfirm={() => { if (confirmTarget) { deleteMutation.mutate(confirmTarget.id); setConfirmTarget(null); } }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
