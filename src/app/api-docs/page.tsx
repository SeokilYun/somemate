import type { Metadata } from "next";
import ApiDocsClient from "./ApiDocsClient";

export const metadata: Metadata = {
  title: "썸메이트 API 문서",
};

export default function ApiDocsPage() {
  return <ApiDocsClient />;
}
