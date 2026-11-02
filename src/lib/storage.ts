import { createClient } from "@supabase/supabase-js";
import {
  initialState,
  stateSchema,
  type StudioState,
  type Content,
} from "./model";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export const configured = Boolean(url && key);
export type Snapshot = { state: StudioState; revision: number };
export type Mode = "local" | "cloud";
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("luciana-content-studio", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("studio");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function localRead(): Promise<Snapshot> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("studio", "readwrite"),
      store = tx.objectStore("studio"),
      r = store.get("state");
    let result: Snapshot;
    r.onsuccess = () => {
      result = r.result ?? { state: initialState(), revision: 0 };
      result.state = stateSchema.parse(result.state);
      if (!r.result) store.put(result, "state");
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? Error("Falha ao ler os dados locais"));
    };
  });
}
export async function load(mode: Mode): Promise<Snapshot> {
  if (mode === "local") return localRead();
  if (!supabase) throw Error("Supabase não configurado");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw Error("Entre para acessar o planejamento privado");
  const { data, error } = await supabase
    .from("studio_states")
    .select("payload,revision")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) throw Error(error.message);
  if (data)
    return { state: stateSchema.parse(data.payload), revision: data.revision };
  const state = initialState();
  const { error: insertError } = await supabase
    .from("studio_states")
    .insert({ owner_id: user.id, payload: state, revision: 0 });
  if (insertError) {
    if (insertError.code === "23505") return load(mode);
    throw Error(
      "Acesso não autorizado ou banco não preparado: " + insertError.message,
    );
  }
  return { state, revision: 0 };
}
export async function save(
  mode: Mode,
  state: StudioState,
  revision: number,
): Promise<number> {
  stateSchema.parse(state);
  if (mode === "local") {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("studio", "readwrite"),
        store = tx.objectStore("studio");
      let conflict = false;
      const r = store.get("state");
      r.onsuccess = () => {
        if (r.result?.revision !== revision) {
          conflict = true;
          tx.abort();
          return;
        }
        store.put({ state, revision: revision + 1 }, "state");
      };
      tx.oncomplete = () => {
        db.close();
        resolve(revision + 1);
      };
      tx.onabort = () => {
        db.close();
        reject(
          Error(
            conflict
              ? "O planejamento mudou em outra aba. Recarregue antes de editar."
              : "Não foi possível salvar. Verifique o espaço disponível no navegador.",
          ),
        );
      };
      tx.onerror = () => reject(tx.error);
    });
  }
  if (!supabase) throw Error("Supabase não configurado");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw Error("Sessão expirada");
  const { data, error } = await supabase
    .from("studio_states")
    .update({ payload: state, revision: revision + 1 })
    .eq("owner_id", user.id)
    .eq("revision", revision)
    .select("revision")
    .maybeSingle();
  if (error) throw Error(error.message);
  if (!data)
    throw Error(
      "Conflito de edição ou acesso negado. Recarregue antes de salvar.",
    );
  return data.revision;
}
export async function attach(
  file: File,
  mode: Mode,
): Promise<Content["attachments"][number]> {
  if (file.size > 5 * 1024 * 1024) throw Error("Máximo de 5 MB por arquivo");
  const id = crypto.randomUUID();
  if (mode === "cloud" && supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw Error("Sessão expirada");
    const path = `${user.id}/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage
      .from("studio-assets")
      .upload(path, file);
    if (error) throw Error(error.message);
    return { id, name: file.name, type: file.type, path };
  }
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return { id, name: file.name, type: file.type, data };
}
export async function attachmentURL(a: Content["attachments"][number]) {
  if (a.path && supabase) {
    const { data, error } = await supabase.storage
      .from("studio-assets")
      .createSignedUrl(a.path, 60);
    if (error) throw Error(error.message);
    return data.signedUrl;
  }
  if (a.data?.startsWith("data:")) {
    const response = await fetch(a.data);
    return URL.createObjectURL(await response.blob());
  }
  throw Error("Arquivo não disponível neste modo de armazenamento");
}
