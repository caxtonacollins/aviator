import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BetControls from "@/components/BetControls";
import { GameProvider } from "@/context/GameContext";

describe("BetControls", () => {
  it("renders connect prompt if wallet not connected", () => {
    render(
      <GameProvider>
        <BetControls />
      </GameProvider>
    );
    expect(screen.getByText(/Connect wallet to play/i)).toBeTruthy();
  });
});
