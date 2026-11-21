import { IQACLayout, DocSection, PdfViewer, useOpenDoc, PDF_BASE } from "./IQACShared";

const NIRF_DOCS = [
  { label: "Submitted Institute Data for NIRF '2022'", file: `${PDF_BASE}/NIRF22.pdf` },
  { label: "Submitted Institute Data for NIRF '2023'", file: `${PDF_BASE}/NIRF23.pdf` },
  { label: "Submitted Institute Data for NIRF '2024'", file: `${PDF_BASE}/NIRF24.pdf` },
  { label: "Submitted Institute Data for NIRF '2025'", file: `${PDF_BASE}/NIRF25.pdf` },
  { label: "Submitted Institute Data for NIRF '2026'", file: `${PDF_BASE}/NIRF26.pdf` },
];

export default function NIRFPage({ onBack }) {
  const [doc, openDoc, closeDoc] = useOpenDoc();

  return (
    <IQACLayout title="IQAC/NIRF" onBack={onBack}>
      {doc ? (
        <PdfViewer doc={doc} onClose={closeDoc} />
      ) : (
        <DocSection
          title="National Institutional Ranking Framework (NIRF) Data Submitted"
          docs={NIRF_DOCS}
          onOpen={openDoc}
        />
      )}
    </IQACLayout>
  );
}