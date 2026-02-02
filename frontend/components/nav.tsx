"use client";

import { Wallet } from "@coinbase/onchainkit/wallet";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const Nav = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="bg-black/30 backdrop-blur-sm border-b border-red-500/30 px-4 py-3 relative z-50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Plane" width={48} height={48} className="w-12 h-12" />
                    <span className="font-bold text-xl text-red-800">Aviator</span>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/leaderboard" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">
                        Leaderboard
                    </Link>
                    <Wallet className="text-xs" />
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-gray-300 hover:text-white"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-black/90 border-b border-red-500/30 p-4 flex flex-col gap-4">
                    <Link
                        href="/leaderboard"
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-center transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        Leaderboard
                    </Link>
                    <div className="flex justify-center">
                        <Wallet className="text-xs" />
                    </div>
                </div>
            )}
        </header>
    );
};

export default Nav;
