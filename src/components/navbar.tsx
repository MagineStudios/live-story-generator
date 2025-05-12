"use client";

import Link from "next/link";
import { Zap, GalleryHorizontalEnd } from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function NavBar() {
    const { isSignedIn, isLoaded } = useUser();

    return (
        <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white shadow-sm">
            {/* Left: brand */}
            <Link href="/" className="flex items-center space-x-2 text-2xl font-bold">
                <span>Magic Story</span>
            </Link>

            {/* Right: Gallery (if signed in) + auth controls */}
            <div className="flex items-center space-x-4">
                {isSignedIn && (
                    <Link
                        href="/dashboard"
                        className="flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <GalleryHorizontalEnd className="h-5 w-5" />
                        <span className="hidden sm:inline">Gallery</span>
                    </Link>
                )}

                {!isLoaded ? null : isSignedIn ? (
                    <UserButton />
                ) : (
                    <SignInButton mode="modal">
                        <Button variant="outline">Sign In</Button>
                    </SignInButton>
                )}
            </div>
        </nav>
    );
}