import { Router } from 'express';
import { GameEngine } from '../services/game-engine.service.ts';
import { RoundService } from '../services/round.service.ts'; // Still needed for GET current?

export const createRoundsRouter = (gameEngine: GameEngine) => {
  const router = Router();
  const roundService = new RoundService();

  router.get('/current', async (req, res) => {
    try {
      const round = await roundService.getCurrentRound();
      res.json({ success: true, round });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  router.post('/:roundId/bets', async (req, res) => {
    try {
      // We ignore roundId param validation vs current round for simplicity, 
      // or we can check if roundId matches current.
      const { address, amount } = req.body;
      const saved = await gameEngine.placeBet(address, amount);
      res.json({ success: true, bet: saved });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  router.post('/bets/:betId/cashout', async (req, res) => {
    try {
      const betId = parseInt(req.params.betId, 10);
      // We don't need multiplier from body for cashout anymore because GameEngine calculates it
      // based on current game state. Or we can validate it matches.
      const updated = await gameEngine.cashOutById(betId);
      res.json({ success: true, bet: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  return router;
};
