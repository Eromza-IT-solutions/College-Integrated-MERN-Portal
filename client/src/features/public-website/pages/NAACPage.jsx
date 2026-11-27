import { useState } from "react";
import { IQACLayout, DocSection, DocBar, EmptyNote, PdfViewer, useOpenDoc, PDF_BASE } from "./IQACShared";

/*
  Each tab has `sections`. A section is either
    { title, docs: [{ label, file }] }          -> a titled list of documents
    { bar: { label, file } }                    -> a single document bar
  Only "Composition of the IQAC" is filled in. Add documents to the other tabs
  the same way and they appear automatically.
*/
const TABS = [
  {
    id: "composition",
    label: "Composition of the IQAC",
    sections: [
      { bar: { label: "Administrative Setup (Organogram)", file: `${PDF_BASE}/Organogram.pdf` } },
      {
        title: "Composition of the IQAC",
        docs: [
          { label: "IQAC COMPOSITION 2018-2019", file: `${PDF_BASE}/IQAC_Compostion_2018-19.pdf` },
          { label: "IQAC COMPOSITION 2019-2020", file: `${PDF_BASE}/IQAC_COMPOSITION_2019-20.pdf` },
          { label: "IQAC COMPOSITION 2020-2021", file: `${PDF_BASE}/IQAC_COMPOSITION_2020-21.pdf` },
          { label: "IQAC COMPOSITION 2021-2022", file: `${PDF_BASE}/IQAC_COMPOSITION_2021-22.pdf` },
          { label: "IQAC COMPOSITION 2022-2023", file: `${PDF_BASE}/IQAC_composition_2022-2023.pdf` },
          { label: "IQAC COMPOSITION 2023-2024", file: `${PDF_BASE}/IQAC_Composition_2023-2024.pdf` },
          { label: "IQAC COMPOSITION 2024-2025", file: `${PDF_BASE}/IQAC_Composition_2024-2025.pdf` },
          { label: "IQAC COMPOSITION 2025-2026", file: `${PDF_BASE}/IQAC_Composition_2025-26.pdf` },
        ],
      },
    ],
  },
  { id: "calendar", label: "Academic Calender", sections: [] },
  { id: "aqar", label: "Annual Quality Assurance Report(AQAR)", sections: [] },
  { id: "minutes", label: "Minutes of Meeting", sections: [] },
  { id: "accreditation", label: "Accreditation Details", sections: [] },
  { id: "third", label: "Third Cycle", sections: [] },
  { id: "practices", label: "Best Practices and Institutional Distinctiveness", sections: [] },
  { id: "videos", label: "NAAC Visit Videos", sections: [] },
  { id: "results", label: "NAAC Results", sections: [] },
  { id: "aqardocs", label: "AQAR Documents", sections: [] },
  { id: "survey", label: "Student Satisfaction Survey", sections: [] },
];

export default function NAACPage({ onBack }) {
  const [active, setActive] = useState("composition");
  const [doc, openDoc, closeDoc] = useOpenDoc();
  const tab = TABS.find((t) => t.id === active);

  const side = (
    <nav className="side" aria-label="IQAC / NAAC sections">
      <ul>
        {TABS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              className={"tab" + (t.id === active ? " active" : "")}
              aria-current={t.id === active ? "true" : undefined}
              onClick={() => { setActive(t.id); closeDoc(); }}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <IQACLayout title="IQAC/NAAC" onBack={onBack} side={side}>
      {doc ? (
        <PdfViewer doc={doc} onClose={closeDoc} />
      ) : tab.sections.length ? (
        tab.sections.map((s, i) =>
          s.bar ? (
            <DocBar key={i} doc={s.bar} onOpen={openDoc} />
          ) : (
            <DocSection key={i} title={s.title} docs={s.docs} onOpen={openDoc} />
          )
        )
      ) : (
        <>
          <h2 className="panel-title">{tab.label}</h2>
          <EmptyNote>Documents for “{tab.label}” will be displayed here soon.</EmptyNote>
        </>
      )}
    </IQACLayout>
  );
}