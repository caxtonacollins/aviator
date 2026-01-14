import { Router } from 'express';
import { LeaderboardService } from '../services/leaderboard.service.ts';

const router = Router();
const service = new LeaderboardService();

router.get('/', async (req, res) => {
  try {
    const top = await service.getTop(100);
    res.json({ success: true, leaderboard: top });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
