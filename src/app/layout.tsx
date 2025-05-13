import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import NavBar from "@/components/navbar";
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});


const nunito = Nunito({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-nunito",
});


const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Magic Story",
    description: "Live Story Generation",
};

export default function RootLayout({
   children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider>
            <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} antialiased`}
            >
            <NavBar />
            <Toaster />
            {children}
            </body>
            </html>
        </ClerkProvider>
    );
}
