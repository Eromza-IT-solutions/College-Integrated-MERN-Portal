import { useEffect, useRef, useState } from "react";
import { UploadCloud, Camera, CheckCircle2 } from "lucide-react";
import { Card, Pill, PageShell, useExam, fmt } from "./ExamShared";

function PhotoSection() {
  const { status, setStatus, deadlines } = useExam();
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef();

  useEffect(() => () => status.photo && URL.revokeObjectURL(status.photo.url), []); // eslint-disable-line

  const take = (file) => {
    if (!file) return;
    if (!/^image\/jpe?g$/.test(file.type)) return setErr("Only JPEG / JPG photos are accepted.");
    if (file.size > 500 * 1024) return setErr("Photo must be smaller than 500 KB.");
    setErr("");
    if (status.photo) URL.revokeObjectURL(status.photo.url);
    setStatus((s) => ({ ...s, photo: { url: URL.createObjectURL(file), name: file.name, size: Math.round(file.size / 1024) } }));
  };

  return (
    <Card title="Upload student photo" action={<Pill tone="gold">Last date {fmt(deadlines.photo)}</Pill>}>
      <div className="photo-grid">
        <div
          className={"drop" + (drag ? " drag" : "")}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files[0]); }}
        >
          {status.photo ? (
            <img src={status.photo.url} alt="Your uploaded passport photo" />
          ) : (
            <div className="drop-in"><UploadCloud size={34} /><b>Drag & drop your photo</b><small>or choose a file</small></div>
          )}
        </div>
        <div>
          <ul className="rules">
            <li>Recent passport-size colour photograph, plain background</li>
            <li>Format: *.JPEG or *.JPG</li>
            <li>Size: less than 500 KB</li>
          </ul>
          <input ref={input} type="file" accept="image/jpeg" hidden onChange={(e) => take(e.target.files[0])} />
          <button type="button" className="btn" onClick={() => input.current.click()}>
            <Camera size={16} /> {status.photo ? "Replace photo" : "Choose photo"}
          </button>
          {status.photo && <p className="hint ok"><CheckCircle2 size={14} /> {status.photo.name} · {status.photo.size} KB</p>}
          {err && <p className="err">{err}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function ExamUploadPhoto() {
  return (
    <PageShell title="Upload Student Photo">
      <PhotoSection />
    </PageShell>
  );
}