"use client";

import Nav from "./nav";

const GameScreen = () => {
    return (
        <div className="min-h-screen text-white flex flex-col bg-[linear-gradient(90deg,#1a1a1a_50%,#262626_0%)] bg-size-[200px_100%] bg-repeat">
          <Nav />
            <h1>Game Screen</h1>
        </div>
    );
};

export default GameScreen;