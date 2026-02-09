import { Router, Request, Response } from 'express';
import { ChainService } from '../services/chain.service.js';
import { logger } from '../utils/logger.js';

const router = Router();
const chainService = new ChainService();

// Middleware to verify admin authorization (you should implement proper auth)
const verifyAdmin = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return res.status(500).json({ 
      success: false, 
      error: 'Admin authentication not configured' 
    });
  }

  if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized - Invalid admin credentials' 
    });
  }

  next();
};

// GET /api/admin/house/balance - Get current house balance
router.get('/house/balance', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const balance = await chainService.getHouseBalance();
    res.json({ 
      success: true, 
      balance,
      balanceFormatted: `${balance.toFixed(2)} USDC`
    });
  } catch (err) {
    logger.error('Failed to get house balance', { error: (err as Error).message });
    res.status(500).json({ 
      success: false, 
      error: "failed to get house balance"
    });
  }
});

// POST /api/admin/house/withdraw - Withdraw house profits to owner
router.post('/house/withdraw', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount - must be a positive number' 
      });
    }

    // Get current balance before withdrawal
    const currentBalance = await chainService.getHouseBalance();

    if (amount > currentBalance) {
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient balance. Current balance: ${currentBalance} USDC, Requested: ${amount} USDC` 
      });
    }

    const txHash = await chainService.withdrawHouseProfits(amount);

    res.json({ 
      success: true, 
      txHash,
      amount,
      message: `Successfully withdrew ${amount} USDC to owner wallet`
    });
  } catch (err) {
    logger.error('Failed to withdraw house profits', { error: (err as Error).message });
    res.status(500).json({ 
      success: false, 
      error: (err as Error).message 
    });
  }
});

// GET /api/admin/contract/status - Get contract status
router.get('/contract/status', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const status = await chainService.getContractStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    logger.error('Failed to get contract status', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/contract/pause - Pause contract
router.post('/contract/pause', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const txHash = await chainService.pauseContract();
    res.json({ 
      success: true, 
      txHash,
      message: 'Contract paused successfully'
    });
  } catch (err) {
    logger.error('Failed to pause contract', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/contract/unpause - Unpause contract
router.post('/contract/unpause', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const txHash = await chainService.unpauseContract();
    res.json({ 
      success: true, 
      txHash,
      message: 'Contract unpaused successfully'
    });
  } catch (err) {
    logger.error('Failed to unpause contract', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/contract/operator - Set server operator
router.post('/contract/operator', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string' || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid address format' 
      });
    }

    const txHash = await chainService.setServerOperator(address);
    res.json({ 
      success: true, 
      txHash,
      address,
      message: `Server operator updated to ${address}`
    });
  } catch (err) {
    logger.error('Failed to set server operator', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/house/fund - Fund the house
router.post('/house/fund', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount - must be a positive number' 
      });
    }

    const txHash = await chainService.fundHouse(amount);
    res.json({ 
      success: true, 
      txHash,
      amount,
      message: `Successfully funded house with ${amount} USDC`
    });
  } catch (err) {
    logger.error('Failed to fund house', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/eth/withdraw - Withdraw ETH from contract
router.post('/eth/withdraw', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { to, amount } = req.body;

    if (!to || typeof to !== 'string' || !to.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid recipient address' 
      });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount - must be a positive number' 
      });
    }

    const txHash = await chainService.withdrawETH(to, amount);
    res.json({ 
      success: true, 
      txHash,
      to,
      amount,
      message: `Successfully withdrew ${amount} ETH to ${to}`
    });
  } catch (err) {
    logger.error('Failed to withdraw ETH', { error: (err as Error).message });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
