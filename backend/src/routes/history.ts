import { Router } from 'express';
import { HistoryService } from '../services/history.service.ts';

const router = Router();
const service = new HistoryService();

router.get('/', async (req, res) => {
  try {
    const h = await service.latest(20);
    res.json({ success: true, history: h });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
