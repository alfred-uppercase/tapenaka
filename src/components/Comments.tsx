import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type C = { id: string; parent_id: string | null; user_id: string; username: string; body: string; created_at: string };

export function renderMentions(body: string) {
  return body.split(/(@[\w.-]+)/g).map((part, i) =>
    part.startsWith("@") ? <span key={i} className="font-semibold text-primary">{part}</span> : <span key={i}>{part}</span>);
}

export function friendsQueryKey() { return ["friends"] as const; }

function Composer({ onSend, placeholder, autoFocus }: { onSend: (b: string) => Promise<void>; placeholder: string; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggest, setSuggest] = useState<{ id: string; username: string }[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const mention = /@([\w.-]*)$/.exec(text)?.[1];
  useEffect(() => {
    if (mention === undefined) { setSuggest([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_members", { q: mention });
      setSuggest(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [mention]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try { await onSend(text.trim()); setText(""); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="relative space-y-2">
      <textarea ref={ref} autoFocus={autoFocus} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder={placeholder} rows={2}
        className="w-full rounded-md border border-input bg-card p-3 text-sm" />
      {suggest.length > 0 && (
        <ul className="absolute z-20 w-56 rounded-md border border-border bg-popover p-1 shadow-lg">
          {suggest.map((s) => (
            <li key={s.id}><button type="button" className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
              onClick={() => { setText(text.replace(/@[\w.-]*$/, `@${s.username.replace(/\s+/g, "")} `)); setSuggest([]); ref.current?.focus(); }}>@{s.username}</button></li>
          ))}
        </ul>
      )}
      <Button size="sm" disabled={busy || !text.trim()}>Publier</Button>
    </form>
  );
}

export function Comments({ itemType, itemId }: { itemType: string; itemId: string }) {
  const qc = useQueryClient();
  const key = ["comments", itemType, itemId];
  const me = useQuery({ queryKey: ["me-id"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null });
  const comments = useQuery({ queryKey: key, queryFn: async () => {
    const { data, error } = await supabase.rpc("item_comments", { _type: itemType, _id: itemId });
    if (error) throw error; return data as C[];
  } });
  const friends = useQuery({ queryKey: friendsQueryKey(), queryFn: async () => (await supabase.rpc("my_friends")).data ?? [] });
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const friendIds = new Set((friends.data ?? []).map((f) => f.id));

  async function send(body: string, parent: string | null) {
    const uid = me.data;
    if (!uid) return;
    const { error } = await supabase.from("comments").insert({ item_type: itemType, item_id: itemId, user_id: uid, body, parent_id: parent });
    if (error) { toast.error("Commentaire impossible"); return; }
    setReplyTo(null);
    await qc.invalidateQueries({ queryKey: key });
  }
  async function remove(id: string) {
    await supabase.from("comments").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: key });
  }
  async function addFriend(id: string) {
    const { error } = await supabase.from("friendships").insert({ user_id: me.data!, friend_id: id });
    if (error) toast.error("Ajout impossible"); else toast.success("Ami ajouté");
    await qc.invalidateQueries({ queryKey: friendsQueryKey() });
  }

  const all = comments.data ?? [];
  const roots = all.filter((c) => !c.parent_id).reverse();
  const Row = ({ c }: { c: C }) => (
    <div className="rounded-lg bg-card/60 p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{c.username || "Membre"}</span>
        <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
        {me.data && c.user_id !== me.data && !friendIds.has(c.user_id) && (
          <button className="text-xs text-primary hover:underline" onClick={() => addFriend(c.user_id)}>+ Ajouter en ami</button>
        )}
        {friendIds.has(c.user_id) && <span className="text-xs text-muted-foreground">Ami</span>}
      </div>
      <p className="whitespace-pre-wrap break-words text-sm">{renderMentions(c.body)}</p>
      <div className="mt-1 flex gap-3 text-xs">
        {!c.parent_id && <button className="text-muted-foreground hover:text-foreground" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>Répondre</button>}
        {c.user_id === me.data && <button className="text-muted-foreground hover:text-destructive" onClick={() => remove(c.id)}>Supprimer</button>}
      </div>
    </div>
  );

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h2 className="mb-4 font-display text-xl font-semibold">Commentaires ({all.length})</h2>
      <Composer onSend={(b) => send(b, null)} placeholder="Votre avis… tapez @ pour identifier un membre" />
      <div className="mt-6 space-y-4">
        {roots.map((c) => (
          <div key={c.id} className="space-y-2">
            <Row c={c} />
            <div className="ml-6 space-y-2 border-l border-border pl-4">
              {all.filter((r) => r.parent_id === c.id).map((r) => <Row key={r.id} c={r} />)}
              {replyTo === c.id && <Composer autoFocus onSend={(b) => send(b, c.id)} placeholder={`Répondre à ${c.username}…`} />}
            </div>
          </div>
        ))}
        {comments.isSuccess && roots.length === 0 && <p className="text-sm text-muted-foreground">Soyez le premier à commenter.</p>}
      </div>
    </section>
  );
}

export function FriendsList() {
  const qc = useQueryClient();
  const friends = useQuery({ queryKey: friendsQueryKey(), queryFn: async () => (await supabase.rpc("my_friends")).data ?? [] });
  async function remove(id: string) {
    await supabase.from("friendships").delete().eq("friend_id", id);
    await qc.invalidateQueries({ queryKey: friendsQueryKey() });
  }
  return (
    <section className="mt-10">
      <h2 className="mb-3 font-display text-2xl font-semibold">Mes amis</h2>
      {friends.data?.length ? (
        <ul className="space-y-2">{friends.data.map((f) => (
          <li key={f.id} className="flex items-center justify-between rounded-md bg-card p-3"><span>{f.username}</span>
            <button className="text-sm text-muted-foreground hover:text-destructive" onClick={() => remove(f.id)}>Retirer</button></li>
        ))}</ul>
      ) : <p className="text-sm text-muted-foreground">Ajoutez des amis depuis les commentaires des films.</p>}
    </section>
  );
}
