export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    console.log(`\n📘 API 문서(Swagger UI): ${base}/api-docs\n`);
  }
}
