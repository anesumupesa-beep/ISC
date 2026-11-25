"use client";
import { useRef, useState } from "react";
import { ROOM_TYPES } from "@/lib/cms/types";
import { markSampleReal, saveListing, uploadContentImage, verifyListing } from "../actions";
import { Conflict, DeleteButton, Field, PublishBar, useEditor } from "./kit";

type Row = Record<string, unknown>;
type Photo = { id: string; url: string; alt: string };
const str = (v: unknown) => (v == null ? "" : String(v));
const todayMu = () => new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10);

/** Phone photos are 5-12 MB: shrink to max 1600 px JPEG before upload so they fit the 4 MB limit. */
async function downscale(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_000_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // server still enforces type and size
  }
}

export function ListingEditor({ row, id, initialPhotos }: { row: Row; id?: string; initialPhotos: Photo[] }) {
  const ed = useEditor({ section: "housing", id, version: Number(row.version ?? 0) });
  const [f, setF] = useState({
    title: str(row.title), area: str(row.area), type: str(row.type) || ROOM_TYPES[0], price: str(row.price),
    walk: str(row.walk), includes: str(row.includes), contact: str(row.contact), checkedAt: str(row.checkedAt) || todayMu(),
  });
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [alt, setAlt] = useState("");
  const [upload, setUpload] = useState<{ busy: boolean; err: string }>({ busy: false, err: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function addPhoto() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setUpload({ busy: false, err: "Choose a photo first." });
    if (!alt.trim()) return setUpload({ busy: false, err: "Describe the photo in a few words." });
    setUpload({ busy: true, err: "" });
    try {
      const small = await downscale(file);
      const form = new FormData();
      form.set("file", small);
      form.set("alt", alt);
      const r = await uploadContentImage(form);
      if (!r.ok) return setUpload({ busy: false, err: r.error });
      setPhotos((p) => [...p, { id: r.id!, url: r.url ?? "", alt: alt.trim() }]);
      setAlt("");
      if (fileRef.current) fileRef.current.value = "";
      setUpload({ busy: false, err: "" });
    } catch {
      setUpload({ busy: false, err: "Upload failed. Check your connection and try again." });
    }
  }

  return (
    <form className="surface cms-form" onSubmit={(e) => e.preventDefault()}>
      <Conflict show={ed.conflict} unsaved={JSON.stringify(f, null, 1)} />
      {row.isSample === true && (
        <p className="cms-banner" role="note">
          This listing is sample data. Students see it until you archive it.{" "}
          {id && <button type="button" className="cms-btn" disabled={ed.disabled} onClick={() => ed.run((v) => markSampleReal("listing", Number(id), v))}>Mark as real</button>}
        </p>
      )}
      <Field label="Title" value={f.title} max={100}><input className="cms-input" value={f.title} onChange={set("title")} maxLength={100} autoComplete="off" /></Field>
      <div className="cms-two">
        <Field label="Area" value={f.area} max={60}><input className="cms-input" value={f.area} onChange={set("area")} maxLength={60} list="cms-areas" />
          <datalist id="cms-areas">{["La Tour Koenig", "Pointe-aux-Sables", "Beau Bassin", "Rose Hill", "Quatre Bornes"].map((a) => <option key={a} value={a} />)}</datalist>
        </Field>
        <Field label="Room type">
          <select className="cms-input" value={f.type} onChange={set("type")}>{ROOM_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
      </div>
      <div className="cms-two">
        <Field label="Rent (Rs per month)"><input className="cms-input" inputMode="numeric" pattern="[0-9]*" value={f.price} onChange={set("price")} maxLength={6} /></Field>
        <Field label="Walk to campus" value={f.walk} max={80}><input className="cms-input" value={f.walk} onChange={set("walk")} maxLength={80} placeholder="e.g. 12 min walk" /></Field>
      </div>
      <Field label="Rent includes" value={f.includes} max={120}><input className="cms-input" value={f.includes} onChange={set("includes")} maxLength={120} placeholder="e.g. Water, Wi-Fi" /></Field>
      <Field label="Contact (optional, signed-in students only)" value={f.contact} max={120}><input className="cms-input" value={f.contact} onChange={set("contact")} maxLength={120} /></Field>
      <Field label="Last checked">
        <span className="cms-row-actions">
          <input className="cms-input" type="date" value={f.checkedAt} max={todayMu()} onChange={set("checkedAt")} style={{ flex: 1, minWidth: 160 }} />
          {id && <button type="button" className="cms-btn" disabled={ed.disabled} onClick={() => ed.run((v) => verifyListing(Number(id), v), () => setF((x) => ({ ...x, checkedAt: todayMu() })))}>Verified today</button>}
        </span>
      </Field>

      <fieldset className="cms-photos" style={{ margin: 0 }}>
        <legend className="cms-label" style={{ fontWeight: 500, color: "var(--navy)", fontSize: 13 }}>Photos ({photos.length}/3)</legend>
        <small style={{ color: "var(--muted)" }}>No faces, ID documents or number plates. JPG, PNG or WebP, shrunk automatically.</small>
        {photos.map((p, i) => (
          <div className="cms-photo" key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="cms-thumb" src={p.url} alt={p.alt} width={84} height={84} loading="lazy" />
            <div className="cms-field">
              <input className="cms-input" aria-label={`Description of photo ${i + 1}`} value={p.alt} maxLength={120}
                onChange={(e) => setPhotos((all) => all.map((x) => (x.id === p.id ? { ...x, alt: e.target.value } : x)))} />
              <button type="button" className="cms-btn" onClick={() => setPhotos((all) => all.filter((x) => x.id !== p.id))}>Remove photo</button>
            </div>
          </div>
        ))}
        {photos.length < 3 && (
          <div className="cms-field">
            <input ref={fileRef} className="cms-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose photo" />
            <input className="cms-input" aria-label="Photo description" placeholder="Describe the photo (required)" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={120} />
            <button type="button" className="cms-btn navy" disabled={upload.busy || !ed.online} onClick={addPhoto}>{upload.busy ? "Uploading..." : "Add photo"}</button>
            {upload.err && <span className="cms-msg err" role="alert">{upload.err}</span>}
          </div>
        )}
      </fieldset>

      <PublishBar ed={ed} type="listing" id={id} status={str(row.status)}
        save={(intent) => ed.run((version) => saveListing({
          ...f, price: f.price.trim() === "" ? NaN : Number(f.price), photos: photos.map((p) => ({ id: p.id, alt: p.alt })),
          id: id ? Number(id) : undefined, version: id ? version : undefined, intent,
        }))} />
      {id && <div className="cms-tools"><DeleteButton type="listing" id={Number(id)} version={ed.version} section="housing" /></div>}
    </form>
  );
}
