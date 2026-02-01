'use client';

import { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Pause, 
  Play, 
  Settings, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface ContractStatus {
  owner: string;
  serverOperator: string;
  isPaused: boolean;
  contractAddress: string;
  ethBalance: number;
  usdcBalance: number;
  usdcToken: string;
}

interface Transaction {
  type: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  txHash?: string;
  timestamp: number;
}

export default function AdminDashboard() {
  const [adminSecret, setAdminSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [contractStatus, setContractStatus] = useState<ContractStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'house' | 'contract' | 'advanced'>('overview');

  // Form states
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [newOperator, setNewOperator] = useState('');
  const [ethWithdrawAddress, setEthWithdrawAddress] = useState('');
  const [ethWithdrawAmount, setEthWithdrawAmount] = useState('');

  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    const storedSecret = localStorage.getItem('adminSecret');
    if (storedSecret) {
      setAdminSecret(storedSecret);
      verifyAndLogin(storedSecret);
    }
  }, []);

  const verifyAndLogin = async (secret: string) => {
    setIsLoading(true);
    setError('');
    try {
      console.log("secret", secret);
      const response = await fetch(`${API_URL}/admin/contract/status`, {
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContractStatus(data);
        setIsAuthenticated(true);
        localStorage.setItem('adminSecret', secret);
      } else {
        if (response.status === 401) {
          setError('Invalid admin credentials');
          localStorage.removeItem('adminSecret');
        } else {
          setError('Failed to verify credentials');
        }
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Login verification failed:', err);
      setError('Connection error - backend may be offline');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const addTransaction = (tx: Omit<Transaction, 'timestamp'>) => {
    setTransactions(prev => [{ ...tx, timestamp: Date.now() }, ...prev].slice(0, 10));
  };

  const fetchContractStatus = async (secret: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/contract/status`, {
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContractStatus(data);
      } else if (response.status === 401) {
        // If we get 401 during normal operation, logout
        handleLogout();
      }
    } catch (error) {
      console.error('Failed to fetch contract status:', error);
    }
  };

  const handleLogin = () => {
    if (adminSecret) {
      verifyAndLogin(adminSecret);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminSecret');
    setAdminSecret('');
    setIsAuthenticated(false);
    setContractStatus(null);
    setError('');
  };

  const makeRequest = async (endpoint: string, method: string = 'GET', body?: any) => {
    setIsLoading(true);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${adminSecret}`,
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      console.log("options", options);
      const response = await fetch(`${API_URL}${endpoint}`, options);
      const data = await response.json();

      if (response.ok) {
        addTransaction({
          type: endpoint.split('/').pop() || 'action',
          status: 'success',
          message: data.message || 'Operation completed successfully',
          txHash: data.txHash
        });
        await fetchContractStatus(adminSecret);
        return data;
      } else {
        if (response.status === 401) {
          handleLogout();
          throw new Error('Session expired - please login again');
        }
        throw new Error(data.error || 'Operation failed');
      }
    } catch (error) {
      addTransaction({
        type: 'error',
        status: 'error',
        message: (error as Error).message
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    await makeRequest('/admin/house/withdraw', 'POST', { amount: parseFloat(withdrawAmount) });
    setWithdrawAmount('');
  };

  const handleFund = async () => {
    if (!fundAmount) return;
    await makeRequest('/admin/house/fund', 'POST', { amount: parseFloat(fundAmount) });
    setFundAmount('');
  };

  const handlePause = async () => {
    await makeRequest('/admin/contract/pause', 'POST');
  };

  const handleUnpause = async () => {
    await makeRequest('/admin/contract/unpause', 'POST');
  };

  const handleSetOperator = async () => {
    if (!newOperator) return;
    await makeRequest('/admin/contract/operator', 'POST', { address: newOperator });
    setNewOperator('');
  };

  const handleWithdrawETH = async () => {
    if (!ethWithdrawAddress || !ethWithdrawAmount) return;
    await makeRequest('/admin/eth/withdraw', 'POST', { 
      to: ethWithdrawAddress, 
      amount: parseFloat(ethWithdrawAmount) 
    });
    setEthWithdrawAddress('');
    setEthWithdrawAmount('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
              <Settings className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-slate-400">Enter your admin secret to continue</p>
          </div>
          
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <input
              type="password"
              placeholder="Admin Secret"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all disabled:opacity-50"
            />
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
              ) : (
                <>Access Dashboard</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-slate-400">Manage your Aviator contract</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchContractStatus(adminSecret)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-6 h-6" />}
          title="USDC Balance"
          value={`${contractStatus?.usdcBalance.toFixed(2) || '0.00'}`}
          subtitle="USDC"
          color="green"
        />
        <StatCard
          icon={<Wallet className="w-6 h-6" />}
          title="ETH Balance"
          value={`${contractStatus?.ethBalance.toFixed(4) || '0.0000'}`}
          subtitle="ETH"
          color="blue"
        />
        <StatCard
          icon={contractStatus?.isPaused ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          title="Contract Status"
          value={contractStatus?.isPaused ? 'Paused' : 'Active'}
          subtitle={contractStatus?.isPaused ? 'Game is paused' : 'Game is running'}
          color={contractStatus?.isPaused ? 'red' : 'green'}
        />
        <StatCard
          icon={<Settings className="w-6 h-6" />}
          title="Operator"
          value={contractStatus?.serverOperator.slice(0, 6) + '...' + contractStatus?.serverOperator.slice(-4) || 'N/A'}
          subtitle="Server Operator"
          color="green"
        />
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-2 inline-flex gap-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            Overview
          </TabButton>
          <TabButton active={activeTab === 'house'} onClick={() => setActiveTab('house')}>
            House Management
          </TabButton>
          <TabButton active={activeTab === 'contract'} onClick={() => setActiveTab('contract')}>
            Contract Control
          </TabButton>
          <TabButton active={activeTab === 'advanced'} onClick={() => setActiveTab('advanced')}>
            Advanced
          </TabButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Actions */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <OverviewTab contractStatus={contractStatus} />
          )}

          {activeTab === 'house' && (
            <>
              <ActionCard
                title="Withdraw House Profits"
                description="Withdraw USDC from the house balance to owner wallet"
                icon={<TrendingDown className="w-6 h-6 text-red-400" />}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Amount (USDC)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Available: {contractStatus?.usdcBalance.toFixed(2)} USDC
                    </p>
                  </div>
                  <button
                    onClick={handleWithdraw}
                    disabled={isLoading || !withdrawAmount}
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                    ) : (
                      <>Withdraw to Owner</>
                    )}
                  </button>
                </div>
              </ActionCard>

              <ActionCard
                title="Fund House"
                description="Add USDC to the house balance for player payouts"
                icon={<TrendingUp className="w-6 h-6 text-green-400" />}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Amount (USDC)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                  <button
                    onClick={handleFund}
                    disabled={isLoading || !fundAmount}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                    ) : (
                      <>Fund House</>
                    )}
                  </button>
                </div>
              </ActionCard>
            </>
          )}

          {activeTab === 'contract' && (
            <>
              <ActionCard
                title="Pause/Unpause Contract"
                description="Emergency control to pause or resume the contract"
                icon={contractStatus?.isPaused ? <Play className="w-6 h-6 text-green-400" /> : <Pause className="w-6 h-6 text-orange-400" />}
              >
                <div className="flex gap-3">
                  <button
                    onClick={handlePause}
                    disabled={isLoading || contractStatus?.isPaused}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white font-semibold py-3 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </button>
                  <button
                    onClick={handleUnpause}
                    disabled={isLoading || !contractStatus?.isPaused}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white font-semibold py-3 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Unpause
                  </button>
                </div>
                <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    {contractStatus?.isPaused ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                        <span className="text-orange-400">Contract is currently paused</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Contract is active</span>
                      </>
                    )}
                  </div>
                </div>
              </ActionCard>

              <ActionCard
                title="Set Server Operator"
                description="Update the server operator address"
                icon={<Settings className="w-6 h-6 text-blue-400" />}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      New Operator Address
                    </label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={newOperator}
                      onChange={(e) => setNewOperator(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Current: {contractStatus?.serverOperator}
                    </p>
                  </div>
                  <button
                    onClick={handleSetOperator}
                    disabled={isLoading || !newOperator}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                    ) : (
                      <>Update Operator</>
                    )}
                  </button>
                </div>
              </ActionCard>
            </>
          )}

          {activeTab === 'advanced' && (
            <ActionCard
              title="Withdraw ETH"
              description="Withdraw ETH from the contract (for gas or accidentally sent ETH)"
              icon={<Wallet className="w-6 h-6 text-cyan-400" />}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={ethWithdrawAddress}
                    onChange={(e) => setEthWithdrawAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Amount (ETH)
                  </label>
                  <input
                    type="number"
                    placeholder="0.0000"
                    value={ethWithdrawAmount}
                    onChange={(e) => setEthWithdrawAmount(e.target.value)}
                    step="0.0001"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Available: {contractStatus?.ethBalance.toFixed(4)} ETH
                  </p>
                </div>
                <button
                  onClick={handleWithdrawETH}
                  disabled={isLoading || !ethWithdrawAddress || !ethWithdrawAmount}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    <>Withdraw ETH</>
                  )}
                </button>
              </div>
            </ActionCard>
          )}
        </div>

        {/* Right Column - Transaction History */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl sticky top-8">
            <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent transactions</p>
                </div>
              ) : (
                transactions.map((tx, idx) => (
                  <TransactionItem key={idx} transaction={tx} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function StatCard({ icon, title, value, subtitle, color }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: 'green' | 'blue' | 'red' | 'purple';
}) {
  const colorClasses: Record<'green' | 'blue' | 'red' | 'purple', string> = {
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    red: 'from-red-500/20 to-orange-500/20 border-red-500/30',
    purple: 'from-green-500/20 to-emerald-500/20 border-green-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-xl border rounded-2xl p-6 shadow-xl`}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-slate-900/50 rounded-lg">
          {icon}
        </div>
      </div>
      <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-slate-500 text-sm">{subtitle}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl font-medium transition-all ${
        active
        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function ActionCard({ title, description, icon, children }: any) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-slate-800/50 rounded-lg">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
          <p className="text-slate-400 text-sm">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function OverviewTab({ contractStatus }: { contractStatus: ContractStatus | null }) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-6">Contract Information</h3>
      <div className="space-y-4">
        <InfoRow label="Contract Address" value={contractStatus?.contractAddress || 'N/A'} copyable />
        <InfoRow label="Owner Address" value={contractStatus?.owner || 'N/A'} copyable />
        <InfoRow label="Server Operator" value={contractStatus?.serverOperator || 'N/A'} copyable />
        <InfoRow label="USDC Token" value={contractStatus?.usdcToken || 'N/A'} copyable />
        <InfoRow 
          label="Status" 
          value={
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              contractStatus?.isPaused 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              {contractStatus?.isPaused ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {contractStatus?.isPaused ? 'Paused' : 'Active'}
            </span>
          } 
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value, copyable }: { label: string; value: any; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof value === 'string') {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
      <span className="text-slate-400 text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {typeof value === 'string' ? (
          <span className="text-white text-sm font-mono">{value.slice(0, 10)}...{value.slice(-8)}</span>
        ) : (
          value
        )}
        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <ExternalLink className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const statusConfig = {
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    success: { color: 'text-green-400', bg: 'bg-green-500/20', icon: <CheckCircle className="w-4 h-4" /> },
    error: { color: 'text-red-400', bg: 'bg-red-500/20', icon: <AlertCircle className="w-4 h-4" /> }
  };

  const config = statusConfig[transaction.status];
  const timeAgo = Math.floor((Date.now() - transaction.timestamp) / 1000);
  const timeStr = timeAgo < 60 ? 'Just now' : `${Math.floor(timeAgo / 60)}m ago`;

  return (
    <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
      <div className="flex items-start gap-3">
        <div className={`p-2 ${config.bg} rounded-lg ${config.color}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{transaction.message}</p>
          <p className="text-slate-500 text-xs mt-1">{timeStr}</p>
          {transaction.txHash && (
            <a
              href={`https://basescan.org/tx/${transaction.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 text-xs flex items-center gap-1 mt-1"
            >
              View TX <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
