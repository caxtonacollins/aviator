import { Router } from 'express';
import { RoundService } from '../services/round.service.ts';

const  router = Router();
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
    const roundId = parseInt(req.params.roundId, 10);
    const bet = req.body;
    const saved = await roundService.addBet(roundId, { ...bet, timestamp: Date.now() });
    res.json({ success: true, bet: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/bets/:betId/cashout', async (req, res) => {
  try {
    const betId = parseInt(req.params.betId, 10);
    const { multiplier } = req.body;
    const updated = await roundService.cashOut(betId, Number(multiplier));
    res.json({ success: true, bet: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
