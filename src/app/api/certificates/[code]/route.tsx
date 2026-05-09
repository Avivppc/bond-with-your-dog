import { NextResponse, type NextRequest } from "next/server";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
  Font,
} from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#edf8ff",
    padding: 60,
    fontFamily: "Helvetica",
  },
  border: {
    flex: 1,
    border: "8px solid #8b4b00",
    padding: 40,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 14,
    letterSpacing: 4,
    color: "#8b4b00",
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  heading: {
    fontSize: 36,
    color: "#243036",
    fontFamily: "Helvetica-Bold",
    marginBottom: 24,
    textAlign: "center",
  },
  preName: {
    fontSize: 12,
    color: "#515d64",
    marginBottom: 8,
  },
  name: {
    fontSize: 42,
    color: "#0e666a",
    fontFamily: "Helvetica-Bold",
    marginBottom: 24,
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    color: "#515d64",
    textAlign: "center",
    marginBottom: 12,
  },
  course: {
    fontSize: 22,
    color: "#243036",
    fontFamily: "Helvetica-Bold",
    marginBottom: 36,
    textAlign: "center",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },
  footerCol: {
    flex: 1,
    alignItems: "center",
  },
  signature: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 18,
    color: "#243036",
    marginBottom: 4,
  },
  smallLabel: {
    fontSize: 9,
    color: "#a2afb6",
    letterSpacing: 1.5,
  },
  code: {
    fontSize: 8,
    color: "#a2afb6",
    marginTop: 12,
  },
});

function CertificateDoc({
  studentName,
  courseTitle,
  issuedAt,
  code,
}: {
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  code: string;
}) {
  const issuedDate = new Date(issuedAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <Text style={styles.brand}>KETA TOV ACADEMY</Text>
          <Text style={styles.heading}>Certificate of Completion</Text>
          <Text style={styles.preName}>This certifies that</Text>
          <Text style={styles.name}>{studentName}</Text>
          <Text style={styles.body}>has successfully completed the course</Text>
          <Text style={styles.course}>{courseTitle}</Text>
          <View style={styles.footerRow}>
            <View style={styles.footerCol}>
              <Text style={styles.signature}>Roni</Text>
              <View
                style={{
                  width: 140,
                  height: 1,
                  backgroundColor: "#a2afb6",
                  marginBottom: 4,
                }}
              />
              <Text style={styles.smallLabel}>HEAD COACH</Text>
            </View>
            <View style={styles.footerCol}>
              <Text style={styles.signature}>{issuedDate}</Text>
              <View
                style={{
                  width: 140,
                  height: 1,
                  backgroundColor: "#a2afb6",
                  marginBottom: 4,
                }}
              />
              <Text style={styles.smallLabel}>ISSUED ON</Text>
            </View>
          </View>
          <Text style={styles.code}>Verification code: {code}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: cert, error } = await supabase
    .from("certificates")
    .select("code, student_name, course_title, issued_at")
    .eq("code", code)
    .single();

  if (error || !cert) {
    return NextResponse.json({ error: "certificate not found" }, { status: 404 });
  }

  const stream = await renderToStream(
    <CertificateDoc
      studentName={cert.student_name}
      courseTitle={cert.course_title}
      issuedAt={cert.issued_at}
      code={cert.code}
    />
  );

  // Convert Node stream to Web stream for the Response
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="keta-tov-${code}.pdf"`,
    },
  });
}
