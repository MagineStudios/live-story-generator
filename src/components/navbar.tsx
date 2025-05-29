"use client";

import Link from "next/link";
import { Sparkles, BookOpen, Plus, User } from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function NavBar() {
    const { isSignedIn, isLoaded, user } = useUser();
    const pathname = usePathname();

    return (
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left: Brand */}
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">Magic Story</span>
                    </Link>

                    {/* Center: Navigation */}
                    <div className="hidden sm:flex items-center space-x-1">
                        <Link
                            href="/"
                            className={cn(
                                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                pathname === "/" 
                                    ? "text-purple-600 bg-purple-50" 
                                    : "text-gray-700 hover:text-purple-600 hover:bg-purple-50"
                            )}
                        >
                            <BookOpen className="h-4 w-4 inline mr-1.5" />
                            Browse Stories
                        </Link>
                        
                        {isSignedIn && (
                            <>
                                <Link
                                    href="/dashboard/stories"
                                    className={cn(
                                        "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        pathname === "/dashboard/stories" 
                                            ? "text-purple-600 bg-purple-50" 
                                            : "text-gray-700 hover:text-purple-600 hover:bg-purple-50"
                                    )}
                                >
                                    <User className="h-4 w-4 inline mr-1.5" />
                                    My Stories
                                </Link>
                                
                                <Link
                                    href="/onboarding"
                                    className={cn(
                                        "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        pathname === "/onboarding" 
                                            ? "text-purple-600 bg-purple-50" 
                                            : "text-gray-700 hover:text-purple-600 hover:bg-purple-50"
                                    )}
                                >
                                    <Plus className="h-4 w-4 inline mr-1.5" />
                                    Create Story
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Right: Auth */}
                    <div className="flex items-center space-x-4">
                        {!isLoaded ? (
                            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                        ) : isSignedIn ? (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600 hidden lg:block">
                                    Welcome, {user?.firstName || 'Storyteller'}!
                                </span>
                                <UserButton 
                                    afterSignOutUrl="/"
                                    appearance={{
                                        elements: {
                                            avatarBox: "h-8 w-8"
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <SignInButton mode="modal">
                                    <Button variant="ghost" size="sm">
                                        Sign In
                                    </Button>
                                </SignInButton>
                                <Link href="/sign-up">
                                    <Button 
                                        size="sm"
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                    >
                                        Get Started
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile menu placeholder - you can expand this if needed */}
                <div className="sm:hidden flex items-center justify-center py-2 border-t">
                    <Link
                        href={isSignedIn ? "/onboarding" : "/sign-up"}
                        className="text-sm font-medium text-purple-600"
                    >
                        <Plus className="h-4 w-4 inline mr-1" />
                        Create Story
                    </Link>
                </div>
            </div>
        </nav>
    );
}