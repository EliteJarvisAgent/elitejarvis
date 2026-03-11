import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  image_url: string | null;
  status: string;
  capabilities: string[];
  tasks_completed: number;
  uptime: string;
  color: string;
  sort_order: number;
}

const statusStyle: Record<string, { badge: string; label: string }> = {
  active: { badge: "bg-success/15 text-success border-success/30", label: "Active" },
  idle: { badge: "bg-muted text-muted-foreground border-border", label: "Idle" },
  error: { badge: "bg-destructive/15 text-destructive border-destructive/30", label: "Error" },
};

const BUCKET = "agent-images";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCap, setNewCap] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(error);
      toast.error("Failed to load agents");
    }
    setAgents((data as Agent[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, []);

  const openEdit = (agent: Agent) => { setEditAgent({ ...agent }); setIsNew(false); };

  const openNew = () => {
    setEditAgent({
      id: "",
      name: "",
      role: "",
      description: "",
      image_url: null,
      status: "idle",
      capabilities: [],
      tasks_completed: 0,
      uptime: "99.0%",
      color: "primary",
      sort_order: agents.length,
    });
    setIsNew(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editAgent) return;
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setEditAgent({ ...editAgent, image_url: urlData.publicUrl });
    toast.success("Image uploaded");
  };

  const handleSave = async () => {
    if (!editAgent) return;
    setSaving(true);
    const payload = {
      name: editAgent.name,
      role: editAgent.role,
      description: editAgent.description,
      image_url: editAgent.image_url,
      status: editAgent.status,
      capabilities: editAgent.capabilities,
      tasks_completed: editAgent.tasks_completed,
      uptime: editAgent.uptime,
      color: editAgent.color,
      sort_order: editAgent.sort_order,
    };

    if (isNew) {
      const { error } = await supabase.from("agents").insert(payload);
      if (error) { toast.error("Failed to create agent"); setSaving(false); return; }
      toast.success("Agent created");
    } else {
      const { error } = await supabase.from("agents").update(payload).eq("id", editAgent.id);
      if (error) { toast.error("Failed to update agent"); setSaving(false); return; }
      toast.success("Agent updated");
    }
    setSaving(false);
    setEditAgent(null);
    fetchAgents();
  };

  const handleDelete = async () => {
    if (!editAgent || isNew) return;
    const { error } = await supabase.from("agents").delete().eq("id", editAgent.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Agent deleted");
    setEditAgent(null);
    fetchAgents();
  };

  const removeCap = (cap: string) => {
    if (!editAgent) return;
    setEditAgent({ ...editAgent, capabilities: editAgent.capabilities.filter(c => c !== cap) });
  };

  const addCap = () => {
    if (!editAgent || !newCap.trim()) return;
    setEditAgent({ ...editAgent, capabilities: [...editAgent.capabilities, newCap.trim()] });
    setNewCap("");
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Agent Fleet</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of all AI agents, their roles, and current status.
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Agent
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading agents…</div>
      ) : agents.length === 0 ? (
        <div className="text-muted-foreground text-sm">No agents yet. Add one to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {agents.map((agent, i) => {
            const s = statusStyle[agent.status] || statusStyle.idle;
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
                onClick={() => openEdit(agent)}
                className="glass-panel-elevated rounded-2xl overflow-hidden card-hover group cursor-pointer relative"
              >
                <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-background/80 backdrop-blur rounded-full p-1.5">
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>

                <div className="h-48 bg-secondary/30 flex items-center justify-center overflow-hidden">
                  {agent.image_url ? (
                    <img src={agent.image_url} alt={agent.name} className="h-44 w-44 object-contain transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="h-44 w-44 rounded-full bg-secondary/50 flex items-center justify-center text-4xl font-bold text-muted-foreground">
                      {agent.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{agent.name}</h3>
                      <p className="text-xs font-mono-display text-primary tracking-wide uppercase">{agent.role}</p>
                    </div>
                    <span className={`text-[10px] font-mono-display uppercase px-2.5 py-1 rounded-full border ${s.badge}`}>
                      {s.label}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mt-3 mb-4">{agent.description}</p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {agent.capabilities.map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-[10px] font-mono-display bg-secondary/80 border-border/50">
                        {cap}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pt-3 border-t border-border/40">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                      <span className="text-xs text-muted-foreground">
                        <strong className="text-foreground">{agent.tasks_completed}</strong> tasks
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        <strong className="text-foreground">{agent.uptime}</strong> uptime
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={!!editAgent} onOpenChange={(o) => !o && setEditAgent(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add New Agent" : "Edit Agent"}</DialogTitle>
          </DialogHeader>

          {editAgent && (
            <div className="space-y-4 mt-2">
              {/* Image */}
              <div className="flex items-center gap-4">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="h-20 w-20 rounded-xl bg-secondary/50 flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all shrink-0"
                >
                  {editAgent.image_url ? (
                    <img src={editAgent.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Agent Image</p>
                  <p className="text-xs text-muted-foreground">Click to upload a new image</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input value={editAgent.name} onChange={(e) => setEditAgent({ ...editAgent, name: e.target.value })} placeholder="Agent name" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Role</label>
                <Input value={editAgent.role} onChange={(e) => setEditAgent({ ...editAgent, role: e.target.value })} placeholder="e.g. Research & Analysis" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea value={editAgent.description} onChange={(e) => setEditAgent({ ...editAgent, description: e.target.value })} rows={3} placeholder="What does this agent do?" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Status</label>
                <div className="flex gap-2 mt-1">
                  {["active", "idle", "error"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setEditAgent({ ...editAgent, status: st })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        editAgent.status === st
                          ? statusStyle[st].badge + " font-semibold"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Capabilities</label>
                <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                  {editAgent.capabilities.map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-xs gap-1 pr-1">
                      {cap}
                      <button onClick={() => removeCap(cap)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newCap} onChange={(e) => setNewCap(e.target.value)} placeholder="Add capability" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCap())} className="text-sm" />
                  <Button size="sm" variant="secondary" onClick={addCap}>Add</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Tasks Completed</label>
                  <Input type="number" value={editAgent.tasks_completed} onChange={(e) => setEditAgent({ ...editAgent, tasks_completed: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Uptime</label>
                  <Input value={editAgent.uptime} onChange={(e) => setEditAgent({ ...editAgent, uptime: e.target.value })} placeholder="99.9%" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/40">
                {!isNew && (
                  <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={() => setEditAgent(null)}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving || !editAgent.name.trim()}>
                    {saving ? "Saving…" : isNew ? "Create" : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
