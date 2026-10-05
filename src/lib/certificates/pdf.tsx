import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToStream } from "@react-pdf/renderer";
import { certificateText, type CertificateDesign } from "./design";

export interface CertificateFacts {
  studentName: string;
  dogName: string | null;
  courseTitle: string;
  issuedAt: string;
  code: string;
  /** Lessons in the course; null when unknown (the line then leaves the count out). */
  lessons: number | null;
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#edf8ff", padding: 60, fontFamily: "Helvetica" },
  border: { flex: 1, borderWidth: 8, borderStyle: "solid", padding: 40, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 14, letterSpacing: 4, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  heading: { fontSize: 36, color: "#243036", fontFamily: "Helvetica-Bold", marginBottom: 24, textAlign: "center" },
  preName: { fontSize: 12, color: "#515d64", marginBottom: 8 },
  name: { fontSize: 42, fontFamily: "Helvetica-Bold", marginBottom: 24, textAlign: "center" },
  body: { fontSize: 13, color: "#515d64", textAlign: "center", marginBottom: 12 },
  course: { fontSize: 22, color: "#243036", fontFamily: "Helvetica-Bold", marginBottom: 36, textAlign: "center" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 20 },
  footerCol: { flex: 1, alignItems: "center" },
  signature: { fontFamily: "Helvetica-Oblique", fontSize: 18, color: "#243036", marginBottom: 4 },
  rule: { width: 140, height: 1, backgroundColor: "#a2afb6", marginBottom: 4 },
  smallLabel: { fontSize: 9, color: "#a2afb6", letterSpacing: 1.5 },
  code: { fontSize: 8, color: "#a2afb6", marginTop: 12 },
});

function CertificateDoc({ facts, design }: { facts: CertificateFacts; design: CertificateDesign }) {
  const text = certificateText(design, facts);
  const issued = new Date(facts.issuedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const signer = [design.signerName, design.signerTitle].filter(Boolean).join(" · ").toUpperCase();
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={[styles.border, { borderColor: design.accentColor }]}>
          <Text style={[styles.brand, { color: design.accentColor }]}>BONDED</Text>
          <Text style={styles.heading}>{design.title}</Text>
          {design.intro ? <Text style={styles.preName}>{design.intro}</Text> : null}
          <Text style={[styles.name, { color: design.accentColor }]}>{text.recipient}</Text>
          <Text style={styles.body}>{text.line}</Text>
          <Text style={styles.course}>{facts.courseTitle}</Text>
          <View style={styles.footerRow}>
            <View style={styles.footerCol}>
              <Text style={styles.signature}>{design.signerName}</Text>
              <View style={styles.rule} />
              <Text style={styles.smallLabel}>{signer}</Text>
            </View>
            <View style={styles.footerCol}>
              <Text style={styles.signature}>{issued}</Text>
              <View style={styles.rule} />
              <Text style={styles.smallLabel}>ISSUED ON</Text>
            </View>
          </View>
          <Text style={styles.code}>Verification code: {facts.code}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** The certificate as a PDF response body. */
export async function certificatePdfStream(facts: CertificateFacts, design: CertificateDesign): Promise<ReadableStream<Uint8Array>> {
  const stream = await renderToStream(<CertificateDoc facts={facts} design={design} />);
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });
}
