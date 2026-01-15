const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001/api";

export async function fetchCurrentRound() {
  const res = await fetch(`${API_BASE}/rounds/current`);
  if (!res.ok) throw new Error("Failed to fetch current round");
  const j = await res.json();
  return j.round;
}

export async function placeBetRest(
  roundId: number,
  address: string,
  amount: number,
  txHash?: string
) {
  const body: any = { address, amount };
  if (txHash) body.txHash = txHash;
  const res = await fetch(`${API_BASE}/rounds/${roundId}/bets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to place bet");
  return res.json();
}

export async function cashOutRest(betId: number, multiplier?: number) {
  const res = await fetch(`${API_BASE}/rounds/bets/${betId}/cashout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ multiplier }),
  });
  if (!res.ok) throw new Error("Failed to cash out");
  return res.json();
}

export async function fetchLeaderboard() {
  const res = await fetch(`${API_BASE}/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  const j = await res.json();
  return j.leaderboard || [];
}
