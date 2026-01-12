"use client";

import { Wallet } from "@coinbase/onchainkit/wallet";
import Image from "next/image";

const Nav = () => {
    return (
        <header className="bg-black/30 backdrop-blur-sm border-b border-red-500/30 px-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Plane" width={48} height={48} className="w-12 h-12" />
                    <span className="font-bold text-xl text-red-800">Aviator</span>
                </div>
                <Wallet className="text-xs" />
            </div>
        </header>
    );
};

export default Nav;
