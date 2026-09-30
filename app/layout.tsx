import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://sanghyeon-studio.podo303.chatgpt.site"),
  title: "Sanghyeon Studio — 우리 집 3D 인테리어",
  description: "광교상현마을현대 33평을 위한 실측 기반 3D 인테리어 스튜디오",
  openGraph: {
    title: "Sanghyeon Studio",
    description: "광교상현마을현대 33평을 위한 우리 집 3D 인테리어",
    type: "website",
    locale: "ko_KR",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Sanghyeon Studio 3D 아파트 미리보기" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sanghyeon Studio",
    description: "우리 집 3D 인테리어",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
