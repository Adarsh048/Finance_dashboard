import React, { useState, useMemo, createContext, useContext, useEffect, useReducer } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Search, Download, Moon, Sun, X, Pencil, ShieldCheck, 
  PieChart as PieChartIcon, List, BarChart2, FileText, Filter, Loader2, ChevronDown, Check
} from 'lucide-react';

// ==========================================
// 1. UTILS 
// ==========================================

const cn = (...classes) => classes.filter(Boolean).join(' ');

const formatCurrency = (amount) => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  } catch (e) {
    return `₹${amount}`;
  }
};

const formatDate = (dateString, format = 'medium') => {
  try {
    const options = format === 'short' 
      ? { month: 'short', day: 'numeric' } 
      : { month: 'short', day: 'numeric', year: 'numeric' };
    return new Intl.DateTimeFormat('en-IN', options).format(new Date(dateString));
  } catch (e) {
    return dateString;
  }
};

const exportData = (data, format, filenamePrefix = 'ledger_export') => {
  let content = '';
  let mimeType = '';
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${timestamp}.${format}`;

  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
    mimeType = 'application/json';
  } else {
    const headers = ['ID', 'Date', 'Merchant', 'Category', 'Amount', 'Type', 'Status', 'Note'];
    const rows = data.map(t => [
      t.id, t.date, `"${t.merchant}"`, t.category, t.amount, t.type, t.status, `"${t.note || ''}"`
    ].join(','));
    content = [headers.join(','), ...rows].join('\n');
    mimeType = 'text/csv';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ==========================================
// 2. DATA ENGINE
// ==========================================

const generateMockData = () => {
  const data = [];
  const today = new Date();
  
  const templates = [
    { cat: 'Income', type: 'income', merchant: 'Zerodha Broking (Dividends)', min: 1500000, max: 4500000 },
    { cat: 'Income', type: 'income', merchant: 'Prestige Estates Rental', min: 800000, max: 800000 },
    { cat: 'Income', type: 'income', merchant: 'Blackstone Capital Gains', min: 12000000, max: 35000000 },
    { cat: 'Lifestyle', type: 'expense', merchant: 'DLF Golf & Country Club', min: 1200000, max: 1500000 },
    { cat: 'Lifestyle', type: 'expense', merchant: 'Rolex Boutique Mumbai', min: 1200000, max: 3500000 },
    { cat: 'Travel', type: 'expense', merchant: 'Emirates First Class', min: 600000, max: 1500000 },
    { cat: 'Travel', type: 'expense', merchant: 'The Ritz-Carlton Maldives', min: 1200000, max: 2800000 },
    { cat: 'Advisory', type: 'expense', merchant: 'Julius Baer Wealth Mgt', min: 500000, max: 1200000 },
    { cat: 'Advisory', type: 'expense', merchant: 'KPMG Tax Advisory', min: 400000, max: 800000 },
    { cat: 'Real Estate', type: 'expense', merchant: 'Lodha Luxury Maintenance', min: 200000, max: 350000 },
    { cat: 'Investments', type: 'expense', merchant: 'Sotheby\'s Fine Art', min: 4500000, max: 12500000 },
    { cat: 'Investments', type: 'expense', merchant: 'AIF Capital Call', min: 7500000, max: 25000000 },
  ];

  for (let i = 0; i < 75; i++) {
    const t = templates[Math.floor(Math.random() * templates.length)];
    const date = new Date(today);
    date.setDate(date.getDate() - Math.floor(Math.random() * 90));

    data.push({
      id: `tx_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      date: date.toISOString().split('T')[0],
      merchant: t.merchant,
      category: t.cat,
      amount: Math.floor(Math.random() * (t.max - t.min + 1)) + t.min,
      type: t.type,
      status: Math.random() > 0.95 ? 'pending' : 'cleared',
      note: Math.random() > 0.8 ? 'Pending advisory review' : undefined
    });
  }
  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const safeStorageGet = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};

const safeStorageSet = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* Ignore quota errors */ }
};

const loadTransactions = () => {
  const stored = safeStorageGet('fin_transactions_hni_v1');
  if (stored) {
    try { return JSON.parse(stored); } catch { /* Corrupt data */ }
  }
  const mock = generateMockData();
  safeStorageSet('fin_transactions_hni_v1', JSON.stringify(mock));
  return mock;
};

// ==========================================
// 3. STATE MANAGEMENT 
// ==========================================

const AppContext = createContext();

const appReducer = (state, action) => {
  switch (action.type) {
    case 'INIT_DATA':
      return { ...state, transactions: action.payload, isFetching: false };
    case 'SET_ROLE': return { ...state, role: action.payload };
    case 'START_ROLE_SWITCH': return { ...state, switchingToRole: action.payload };
    case 'COMPLETE_ROLE_SWITCH': return { ...state, role: action.payload, switchingToRole: null };
    case 'TOGGLE_DARK': {
      const newDark = !state.darkMode;
      safeStorageSet('fin_dark', String(newDark));
      if (newDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return { ...state, darkMode: newDark };
    }
    case 'SELECT_TXN': return { ...state, selectedTxn: action.payload };
    case 'TOGGLE_CMD': return { ...state, cmdOpen: action.payload !== undefined ? action.payload : !state.cmdOpen };
    case 'NAVIGATE': return { ...state, activePage: action.payload };
    case 'UPDATE_TXN': {
      const updated = state.transactions.map(t => t.id === action.payload.id ? action.payload : t);
      safeStorageSet('fin_transactions_hni_v1', JSON.stringify(updated));
      return { ...state, transactions: updated, selectedTxn: null };
    }
    case 'DELETE_TXN': {
      const filtered = state.transactions.filter(t => t.id !== action.payload);
      safeStorageSet('fin_transactions_hni_v1', JSON.stringify(filtered));
      return { ...state, transactions: filtered, selectedTxn: null };
    }
    default: return state;
  }
};

const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, {
    isFetching: true,
    transactions: [],
    role: 'admin',
    darkMode: safeStorageGet('fin_dark') !== 'false',
    selectedTxn: null,
    cmdOpen: false,
    activePage: 'dashboard',
    switchingToRole: null,
  });

  useEffect(() => {
    if (state.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [state.darkMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const txns = loadTransactions();
      dispatch({ type: 'INIT_DATA', payload: txns });
    }, 800); 
    return () => clearTimeout(timer);
  }, []);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

const useAppStore = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within Provider');
  return ctx;
};

// ==========================================
// 4. MICRO-COMPONENTS
// ==========================================

const Button = ({ children, variant = 'primary', className, ...props }) => {
  const base = "inline-flex items-center justify-center text-[11px] font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none rounded-[4px] px-3 py-1.5 cursor-pointer";
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
    ghost: "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50",
    outline: "border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
  };
  return <button className={cn(base, variants[variant], className)} {...props}>{children}</button>;
};

// ==========================================
// 5. SHARED ELEMENTS 
// ==========================================

const RoleSwitchOverlay = () => {
  const { state } = useAppStore();
  if (!state.switchingToRole) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col items-center">
         <Loader2 className="w-6 h-6 animate-spin text-zinc-900 dark:text-zinc-100 mb-4" />
         <h2 className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">
           Switching to {state.switchingToRole === 'admin' ? 'Admin' : 'Viewer'} Workspace...
         </h2>
      </div>
    </div>
  );
};

const CommandPalette = () => {
  const { state, dispatch } = useAppStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); dispatch({ type: 'TOGGLE_CMD' }); }
      if (e.key === 'Escape' && state.cmdOpen) dispatch({ type: 'TOGGLE_CMD', payload: false });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.cmdOpen, dispatch]);

  if (!state.cmdOpen) return null;

  const actions = [
    { id: 'nav-dash', label: 'Go to Overview', icon: PieChartIcon, run: () => { dispatch({ type: 'NAVIGATE', payload: 'dashboard' }); dispatch({ type: 'TOGGLE_CMD', payload: false }); } },
    { id: 'nav-txn', label: 'Go to Ledger', icon: List, run: () => { dispatch({ type: 'NAVIGATE', payload: 'transactions' }); dispatch({ type: 'TOGGLE_CMD', payload: false }); } },
    { id: 'nav-ana', label: 'Go to Intelligence', icon: BarChart2, run: () => { dispatch({ type: 'NAVIGATE', payload: 'analytics' }); dispatch({ type: 'TOGGLE_CMD', payload: false }); } },
    { id: 'theme', label: 'Toggle Theme', icon: state.darkMode ? Sun : Moon, run: () => { dispatch({ type: 'TOGGLE_DARK' }); dispatch({ type: 'TOGGLE_CMD', payload: false }); } },
  ].filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-zinc-900/10 dark:bg-[#0A0A0A]/80 backdrop-blur-[2px]" onClick={() => dispatch({ type: 'TOGGLE_CMD', payload: false })}>
      <div className="w-full max-w-[420px] bg-white dark:bg-[#111] shadow-2xl border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-3 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <Search className="w-3.5 h-3.5 text-zinc-400 mr-2" />
          <input autoFocus className="flex-1 bg-transparent border-none outline-none text-[12px] text-zinc-900 dark:text-white" placeholder="Search commands..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1.5">
          {actions.map(action => (
            <button key={action.id} onClick={action.run} className="w-full flex items-center px-2 py-2 text-[11px] font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-[4px] text-left text-zinc-700 dark:text-zinc-300">
              <action.icon className="w-3.5 h-3.5 mr-3 text-zinc-400" /> {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const TransactionDrawer = () => {
  const { state, dispatch } = useAppStore();
  const txn = state.selectedTxn;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    setIsEditing(false);
    if (txn) setFormData(txn);
  }, [txn]);

  if (!txn || !formData) return null;

  return (
    <>
      <div className="fixed inset-0 bg-zinc-900/10 dark:bg-[#0A0A0A]/60 z-40 transition-opacity" onClick={() => dispatch({ type: 'SELECT_TXN', payload: null })} />
      <div className="fixed inset-y-0 right-0 w-full max-w-[360px] bg-white dark:bg-[#111] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/50">
          <h2 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">{isEditing ? 'Edit Ledger Entry' : 'Ledger Entry'}</h2>
          <button onClick={() => dispatch({ type: 'SELECT_TXN', payload: null })} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        
        {isEditing ? (
          <div className="px-6 py-6 flex-1 overflow-y-auto space-y-5">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Merchant</label>
              <input type="text" value={formData.merchant} onChange={e => setFormData({...formData, merchant: e.target.value})} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 text-[13px] text-zinc-900 dark:text-zinc-100 pb-1.5 outline-none focus:border-zinc-500" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Amount</label>
                <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 text-[13px] text-zinc-900 dark:text-zinc-100 pb-1.5 outline-none focus:border-zinc-500 tabular-nums" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 text-[13px] text-zinc-900 dark:text-zinc-100 pb-1.5 outline-none focus:border-zinc-500">
                  <option value="expense" className="dark:bg-[#111]">Expense</option>
                  <option value="income" className="dark:bg-[#111]">Income</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 text-[13px] text-zinc-900 dark:text-zinc-100 pb-1.5 outline-none focus:border-zinc-500">
                <option value="Investments" className="dark:bg-[#111]">Investments</option>
                <option value="Real Estate" className="dark:bg-[#111]">Real Estate</option>
                <option value="Travel" className="dark:bg-[#111]">Travel</option>
                <option value="Lifestyle" className="dark:bg-[#111]">Lifestyle</option>
                <option value="Advisory" className="dark:bg-[#111]">Advisory</option>
                <option value="Income" className="dark:bg-[#111]">Income</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 flex-1 overflow-y-auto">
            <div className="mb-8 flex flex-col items-start border-b border-zinc-100 dark:border-zinc-800/50 pb-6">
              <h1 className={cn("text-3xl font-semibold tracking-tight tabular-nums mb-1", txn.type === 'income' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-900 dark:text-zinc-100')}>
                {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
              </h1>
              <p className="text-[13px] text-zinc-900 dark:text-zinc-100 font-medium">{txn.merchant}</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-baseline"><span className="text-[12px] text-zinc-500">Date</span><span className="text-[12px] text-zinc-900 dark:text-zinc-100 font-medium tabular-nums">{formatDate(txn.date)}</span></div>
              <div className="flex justify-between items-baseline"><span className="text-[12px] text-zinc-500">Status</span><span className="text-[12px] font-medium capitalize">{txn.status}</span></div>
              <div className="flex justify-between items-baseline"><span className="text-[12px] text-zinc-500">Category</span><span className="text-[12px] text-zinc-900 dark:text-zinc-100 font-medium">{txn.category}</span></div>
            </div>
          </div>
        )}
        
        {state.role === 'admin' ? (
          <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#111] flex space-x-3">
            {isEditing ? (
              <>
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1" onClick={() => dispatch({ type: 'UPDATE_TXN', payload: formData })}>Save Changes</Button>
              </>
            ) : (
              <>
                 <Button variant="outline" className="flex-1 text-red-600" onClick={() => dispatch({ type: 'DELETE_TXN', payload: txn.id })}>Delete</Button>
                 <Button variant="secondary" className="flex-1" onClick={() => setIsEditing(true)}>
                   <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                 </Button>
              </>
            )}
          </div>
        ) : (
          <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#111] flex items-center justify-center">
             <span className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center font-medium"><ShieldCheck className="w-3 h-3 mr-1.5 opacity-70" /> Viewer Access (Read-Only)</span>
          </div>
        )}
      </div>
    </>
  );
};

// ==========================================
// 6. PAGE: DASHBOARD (OVERVIEW)
// ==========================================

const DashboardPage = () => {
  const { state } = useAppStore();
  const txns = state.transactions;

  const currentMonthTxns = useMemo(() => {
    const now = new Date();
    return txns.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
  }, [txns]);

  const currentStats = useMemo(() => currentMonthTxns.reduce((acc, t) => {
    if (t.type === 'income') acc.in += t.amount; else acc.out += t.amount; return acc;
  }, { in: 0, out: 0 }), [currentMonthTxns]);

  const totalBalance = txns.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

  const chartData = useMemo(() => {
    const cutoff = new Date(new Date().getTime() - 14 * 24 * 60 * 60 * 1000);
    const recent = txns.filter(t => new Date(t.date) >= cutoff);
    const daily = recent.reduce((acc, t) => {
      if (!acc[t.date]) acc[t.date] = { in: 0, out: 0 };
      if (t.type === 'income') acc[t.date].in += t.amount; else acc[t.date].out += t.amount; return acc;
    }, {});
    return Object.entries(daily).map(([date, vals]) => ({ date, balance: vals.in - vals.out })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [txns]);

  const catData = useMemo(() => {
    const grouped = currentMonthTxns.filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount; return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [currentMonthTxns]);

  const PIE_COLORS = state.darkMode ? ['#e4e4e7', '#a1a1aa', '#71717a', '#52525b', '#3f3f46'] : ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#e4e4e7'];

  return (
    <div className="animate-in fade-in duration-500">
      <section className="flex flex-col lg:flex-row justify-between items-start pb-10 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="mb-8 lg:mb-0 max-w-sm w-full">
          <h2 className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-2 font-semibold tracking-widest uppercase">Net Position</h2>
          <h1 className="text-5xl font-medium tracking-tight text-zinc-900 dark:text-white tabular-nums mb-3 leading-none">{formatCurrency(totalBalance)}</h1>
          <p className="text-[12px] text-zinc-500">Current operating capital. Liquid reserves stable.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto mt-4 lg:mt-0">
          <div className="flex-1 sm:w-36 p-4 rounded-[6px] border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-[#111]">
            <span className="block text-[11px] text-zinc-500 mb-1.5 font-medium uppercase tracking-wider">MTD Inflows</span>
            <span className="block text-[16px] font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{formatCurrency(currentStats.in)}</span>
          </div>
          <div className="flex-1 sm:w-36 p-4 rounded-[6px] border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-[#111]">
            <span className="block text-[11px] text-zinc-500 mb-1.5 font-medium uppercase tracking-wider">MTD Outflows</span>
            <span className="block text-[16px] font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{formatCurrency(currentStats.out)}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 py-12">
        <div className="col-span-1 lg:col-span-8 flex flex-col">
          <div className="flex items-center justify-between mb-8"><h3 className="text-[11px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-semibold">Net Flow Trend (14D)</h3></div>
          <div className="h-[240px] w-full mt-auto">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={state.darkMode ? '#27272a' : '#f4f4f5'} strokeDasharray="3 3" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={(val) => formatDate(val, 'short')} dy={12} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={(v) => `₹${v/1000}k`} dx={-10} width={40} />
                  <RechartsTooltip cursor={{ stroke: '#a1a1aa', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ backgroundColor: state.darkMode ? '#111' : '#fff', border: `1px solid ${state.darkMode ? '#27272a' : '#e4e4e7'}`, borderRadius: '6px', padding: '8px 12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} itemStyle={{ color: state.darkMode ? '#fff' : '#000', fontSize: '12px', fontWeight: 500 }} labelStyle={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '4px' }} formatter={(val) => [formatCurrency(val), 'Net']} labelFormatter={(label) => formatDate(label)} />
                  <Line type="monotone" dataKey="balance" stroke={state.darkMode ? '#a1a1aa' : '#52525b'} strokeWidth={1.5} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: state.darkMode ? '#fff' : '#000' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[6px] text-zinc-400 dark:text-zinc-600">
                <BarChart2 className="w-6 h-6 mb-2 opacity-20" />
                <span className="text-[12px]">No trend data.</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="col-span-1 lg:col-span-4 flex flex-col">
          <div className="flex items-center justify-between mb-8"><h3 className="text-[11px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-semibold">Spend Allocation</h3></div>
          
          <div className="h-[180px] w-full mb-6">
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                    {catData.map((_, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(val) => formatCurrency(val)} contentStyle={{ backgroundColor: state.darkMode ? '#111' : '#fff', border: `1px solid ${state.darkMode ? '#27272a' : '#e4e4e7'}`, borderRadius: '6px', padding: '6px 10px', fontSize: '12px' }} itemStyle={{ color: state.darkMode ? '#fff' : '#000' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[6px] text-zinc-400 dark:text-zinc-600">
                <PieChartIcon className="w-6 h-6 mb-2 opacity-20" />
                <span className="text-[12px]">No allocation data.</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {catData.slice(0, 3).map((cat, i) => (
              <div key={cat.name} className="flex justify-between items-center text-[12px]">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-zinc-600 dark:text-zinc-400">{cat.name}</span>
                </div>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// ==========================================
// 7. PAGE: TRANSACTIONS (LEDGER)
// ==========================================

const TransactionsPage = () => {
  const { state, dispatch } = useAppStore();
  const txns = state.transactions;
  
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  const categories = ['All', ...Array.from(new Set(txns.map(t => t.category)))].sort();

  const sortOptions = [
    { value: 'date-desc', label: 'Newest First' },
    { value: 'date-asc', label: 'Oldest First' },
    { value: 'amount-desc', label: 'Highest Amount' },
    { value: 'amount-asc', label: 'Lowest Amount' },
  ];

  const filteredTxns = useMemo(() => {
    let result = txns.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (catFilter !== 'All' && t.category !== catFilter) return false;
      if (query && !t.merchant.toLowerCase().includes(query.toLowerCase()) && !t.category.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
  }, [txns, typeFilter, catFilter, query, sortBy]);

  return (
    <div className="animate-in fade-in duration-500 flex flex-col h-full">
      <div className="pb-6 border-b border-zinc-200/60 dark:border-zinc-800/60 sticky top-0 bg-white/95 dark:bg-[#0A0A0A]/95 z-10 pt-2">
        <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-white mb-6">Ledger</h1>
        
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="text" placeholder="Search merchant..." value={query} onChange={e => setQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 text-[12px] bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-[4px] outline-none text-zinc-900 dark:text-zinc-100" />
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-zinc-50 dark:bg-zinc-800/40 p-0.5 rounded-[4px] border border-zinc-200 dark:border-zinc-800">
              {['all', 'income', 'expense'].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} className={cn("px-3 py-1.5 text-[11px] font-medium capitalize rounded-[3px] transition-colors", typeFilter === t ? "bg-white dark:bg-[#111] text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300")}>{t}</button>
              ))}
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center justify-between w-[120px] bg-zinc-50 dark:bg-zinc-800/40 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-[4px] px-2.5 py-1.5 outline-none hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <span>{sortOptions.find(o => o.value === sortBy)?.label}</span>
                <ChevronDown className="w-3 h-3 ml-2 opacity-70" />
              </button>

              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute top-full right-0 mt-1 w-36 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-[4px] shadow-xl z-30 overflow-hidden py-1">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => { setSortBy(option.value); setIsSortOpen(false); }}
                        className="w-full text-left px-3 py-2 text-[11px] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center space-x-1.5 border-l border-zinc-200 dark:border-zinc-800 pl-5">
            <Filter className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
            {categories.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} className={cn("px-2.5 py-1.5 text-[11px] rounded-[4px] transition-colors whitespace-nowrap", catFilter === cat ? "bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900 font-medium" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50")}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 mt-4 w-full">
        <div className="flex flex-col">
          {filteredTxns.length === 0 ? (
            <div className="py-16 text-center text-[12px] text-zinc-500">No records match the current filters.</div>
          ) : (
            filteredTxns.map((txn) => (
              <div key={txn.id} onClick={() => dispatch({ type: 'SELECT_TXN', payload: txn })} className="flex justify-between items-center py-3.5 border-b border-zinc-100 dark:border-zinc-800/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 cursor-pointer transition-colors px-3 -mx-3 rounded-[4px]">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">{txn.merchant}</span>
                  <span className="text-[11px] text-zinc-500 mt-1">{txn.category} • {formatDate(txn.date, 'short')}</span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className={cn("text-[13px] font-medium tabular-nums tracking-tight", txn.type === 'income' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-900 dark:text-zinc-100')}>
                    {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 8. PAGE: ANALYTICS (INTELLIGENCE)
// ==========================================

const AnalyticsPage = () => {
  const { state } = useAppStore();
  const txns = state.transactions;
  const [timeRange, setTimeRange] = useState('1M');

  const rangeDays = timeRange === '7D' ? 7 : timeRange === '1M' ? 30 : 90;
  const cutoff = useMemo(() => new Date(new Date().getTime() - rangeDays * 24 * 60 * 60 * 1000), [rangeDays]);
  const prevCutoff = useMemo(() => new Date(cutoff.getTime() - rangeDays * 24 * 60 * 60 * 1000), [cutoff, rangeDays]);
  
  const currentTxns = useMemo(() => txns.filter(t => new Date(t.date) >= cutoff), [txns, cutoff]);
  const prevTxns = useMemo(() => txns.filter(t => new Date(t.date) >= prevCutoff && new Date(t.date) < cutoff), [txns, cutoff, prevCutoff]);
  
  const stats = useMemo(() => currentTxns.reduce((acc, t) => {
    if (t.type === 'income') acc.in += t.amount; else acc.out += t.amount; return acc;
  }, { in: 0, out: 0 }), [currentTxns]);

  const prevStats = useMemo(() => prevTxns.reduce((acc, t) => {
    if (t.type === 'income') acc.in += t.amount; else acc.out += t.amount; return acc;
  }, { in: 0, out: 0 }), [prevTxns]);

  const avgDaily = stats.out / rangeDays;

  const chartData = useMemo(() => {
    const daily = currentTxns.reduce((acc, t) => {
      if (t.type === 'expense') acc[t.date] = (acc[t.date] || 0) + t.amount; return acc;
    }, {});
    return Object.entries(daily).map(([date, amount]) => ({ date, amount })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [currentTxns]);

  const catData = useMemo(() => {
    const grouped = currentTxns.filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount; return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [currentTxns]);

  const PIE_COLORS = state.darkMode ? ['#e4e4e7', '#a1a1aa', '#71717a', '#52525b', '#3f3f46'] : ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#e4e4e7'];

  const expenseChange = prevStats.out === 0 ? 0 : ((stats.out - prevStats.out) / prevStats.out) * 100;
  const topCategory = catData.length > 0 ? catData[0] : null;
  const largestTxn = useMemo(() => currentTxns.filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0], [currentTxns]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-end pb-6 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-white">Intelligence</h1>
        <div className="flex items-center space-x-1 bg-zinc-50 dark:bg-zinc-800/40 p-0.5 rounded-[4px]">
          {['7D', '1M', '3M'].map(r => (
            <button key={r} onClick={() => setTimeRange(r)} className={cn("px-3 py-1.5 text-[11px] font-medium rounded-[3px] transition-colors", timeRange === r ? "bg-white dark:bg-[#111] text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300")}>{r}</button>
          ))}
        </div>
      </div>

      {/* Dynamic Insights Cards */}
      <div className="py-8 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="p-4 rounded-[6px] bg-zinc-50/50 dark:bg-[#111] border border-zinc-200/60 dark:border-zinc-800/60">
          <h4 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Period Trend</h4>
          <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {prevStats.out === 0 
              ? "Sufficient historical data is not yet available for comparison." 
              : <>Outflows are <strong className="font-medium text-zinc-900 dark:text-white">{expenseChange > 0 ? 'up' : 'down'} {Math.abs(expenseChange).toFixed(1)}%</strong> compared to the previous {rangeDays} days.</>}
          </p>
        </div>
        <div className="p-4 rounded-[6px] bg-zinc-50/50 dark:bg-[#111] border border-zinc-200/60 dark:border-zinc-800/60">
          <h4 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Top Category</h4>
          <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {topCategory 
              ? <>Your highest spending category is <strong className="font-medium text-zinc-900 dark:text-white">{topCategory.name}</strong>, accounting for <strong className="font-medium tabular-nums text-zinc-900 dark:text-white">{formatCurrency(topCategory.value)}</strong>.</>
              : "No categorized expenses found for this period."}
          </p>
        </div>
        <div className="p-4 rounded-[6px] bg-zinc-50/50 dark:bg-[#111] border border-zinc-200/60 dark:border-zinc-800/60">
          <h4 className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Largest Transaction</h4>
          <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {largestTxn 
              ? <>The largest isolated expense this period was to <strong className="font-medium text-zinc-900 dark:text-white">{largestTxn.merchant}</strong> for <strong className="font-medium tabular-nums text-zinc-900 dark:text-white">{formatCurrency(largestTxn.amount)}</strong>.</>
              : "No expense transactions recorded this period."}
          </p>
        </div>
      </div>

      <div className="py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="col-span-1 lg:col-span-8">
          <h3 className="text-[11px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-semibold mb-8">Spend Velocity</h3>
          <div className="h-[260px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={state.darkMode ? '#27272a' : '#f4f4f5'} strokeDasharray="3 3" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={(val) => formatDate(val, 'short')} dy={12} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={(v) => `₹${v/1000}k`} dx={-10} width={40} />
                  <RechartsTooltip cursor={{ stroke: '#a1a1aa', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ backgroundColor: state.darkMode ? '#111' : '#fff', border: `1px solid ${state.darkMode ? '#27272a' : '#e4e4e7'}`, borderRadius: '6px', padding: '8px 12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} itemStyle={{ color: state.darkMode ? '#fff' : '#000', fontSize: '12px', fontWeight: 500 }} labelStyle={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '4px' }} formatter={(val) => [formatCurrency(val), 'Spend']} labelFormatter={(label) => formatDate(label)} />
                  <Line type="monotone" dataKey="amount" stroke={state.darkMode ? '#a1a1aa' : '#52525b'} strokeWidth={1.5} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: state.darkMode ? '#fff' : '#000' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[6px] text-zinc-400 dark:text-zinc-600">
                <BarChart2 className="w-6 h-6 mb-2 opacity-20" />
                <span className="text-[12px]">No spend velocity data available.</span>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 lg:col-span-4 flex flex-col">
          <h3 className="text-[11px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-semibold mb-8">Allocation</h3>
          <div className="h-[160px] w-full mb-8">
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                    {catData.map((_, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(val) => formatCurrency(val)} contentStyle={{ backgroundColor: state.darkMode ? '#111' : '#fff', border: `1px solid ${state.darkMode ? '#27272a' : '#e4e4e7'}`, borderRadius: '6px', padding: '6px 10px', fontSize: '12px' }} itemStyle={{ color: state.darkMode ? '#fff' : '#000' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[6px] text-zinc-400 dark:text-zinc-600">
                <PieChartIcon className="w-6 h-6 mb-2 opacity-20" />
                <span className="text-[12px]">No allocation data.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 9. PAGE: REPORTS 
// ==========================================

const ReportsPage = () => {
  const { state } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  
  const [reportRange, setReportRange] = useState('1M');
  const [reportType, setReportType] = useState('all');

  const handleGenerate = () => {
    setLoading(true);
    setGenerated(false);
    setTimeout(() => {
      setLoading(false);
      setGenerated(true);
    }, 1200); 
  };

  const handleExport = (format) => {
    exportData(state.transactions, format);
  };

  const rangeDays = reportRange === '7D' ? 7 : reportRange === '1M' ? 30 : 90;
  const cutoff = new Date(new Date().getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const reportData = useMemo(() => state.transactions.filter(t => new Date(t.date) >= cutoff && (reportType === 'all' || t.type === reportType)), [state.transactions, cutoff, reportType]);
  
  const stats = reportData.reduce((acc, t) => {
    if (t.type === 'income') acc.in += t.amount; else acc.out += t.amount; return acc;
  }, { in: 0, out: 0 });

  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col">
      <div className="pb-6 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-white">Statements</h1>
      </div>

      <div className="flex flex-col lg:flex-row mt-8 flex-1 gap-12">
        <div className="w-full lg:w-64 flex flex-col space-y-8 lg:border-r border-zinc-200/60 dark:border-zinc-800/60 pr-0 lg:pr-10">
          <div>
            <label className="block text-[12px] font-medium text-zinc-700 dark:text-zinc-300 mb-3">Period</label>
            <div className="flex flex-col space-y-1.5">
              {['7D', '1M', '3M'].map(r => (
                <button key={r} onClick={() => setReportRange(r)} className={cn("text-left px-3 py-2 text-[12px] rounded-[4px] transition-colors", reportRange === r ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50")}>{r === '7D' ? 'Last 7 Days' : r === '1M' ? 'Last 30 Days' : 'Last 90 Days'}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-zinc-700 dark:text-zinc-300 mb-3">Transaction Type</label>
            <div className="flex flex-col space-y-1.5">
              {['all', 'income', 'expense'].map(t => (
                <button key={t} onClick={() => setReportType(t)} className={cn("text-left px-3 py-2 text-[12px] rounded-[4px] transition-colors capitalize", reportType === t ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50")}>{t}</button>
              ))}
            </div>
          </div>
          <div className="pt-6 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <Button className="w-full py-2.5 flex justify-center text-[12px]" onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              {loading ? 'Processing...' : 'Generate Statement'}
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-[400px]">
          {!loading && !generated && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
              <FileText className="w-10 h-10 mb-4 opacity-20" />
              <p className="text-[13px]">Configure parameters to generate a statement.</p>
            </div>
          )}

          {loading && (
            <div className="space-y-8 animate-pulse w-full max-w-4xl">
              <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-12" />
              <div className="grid grid-cols-3 gap-8">
                <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded" />
                <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded" />
                <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded" />
              </div>
              <div className="space-y-4 mt-12">
                <div className="h-8 bg-zinc-100 dark:bg-zinc-800/50 rounded" />
                <div className="h-8 bg-zinc-100 dark:bg-zinc-800/50 rounded" />
                <div className="h-8 bg-zinc-100 dark:bg-zinc-800/50 rounded" />
              </div>
            </div>
          )}

          {generated && !loading && (
            <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-[14px] font-medium text-zinc-900 dark:text-white">Statement of Activity</h2>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => handleExport('csv')} className="py-1.5 px-3 text-[11px]">CSV</Button>
                  <Button variant="outline" onClick={() => handleExport('json')} className="py-1.5 px-3 text-[11px]">JSON</Button>
                </div>
              </div>
              
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-[6px] overflow-hidden">
                <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                  <div>Category</div>
                  <div className="text-right">Volume</div>
                </div>
                {Array.from(new Set(reportData.map(t => t.category))).map((cat, i, arr) => {
                  const vol = reportData.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0);
                  return (
                    <div key={cat} className={cn("grid grid-cols-[1fr_auto] gap-4 px-5 py-3.5 text-[13px]", i !== arr.length - 1 && "border-b border-zinc-100 dark:border-zinc-800/50")}>
                      <span className="text-zinc-700 dark:text-zinc-300">{cat}</span>
                      <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100 text-right">{formatCurrency(vol)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 10. APPLICATION SHELL & ERROR BOUNDARY
// ==========================================

const AppShell = () => {
  const { state, dispatch } = useAppStore();

  const pages = {
    dashboard: <DashboardPage />,
    transactions: <TransactionsPage />,
    analytics: <AnalyticsPage />,
    reports: <ReportsPage />
  };

  if (state.isFetching) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex flex-col items-center justify-center">
         <Loader2 className="w-6 h-6 animate-spin text-zinc-900 dark:text-zinc-100 mb-4" />
         <p className="text-[12px] text-zinc-500 uppercase tracking-widest font-medium">Initializing Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800/50 flex">
      
      {/* Sidebar Navigation */}
      <aside className="relative shrink-0 h-screen w-16 hover:w-[240px] transition-[width] duration-300 ease-in-out z-40 bg-zinc-50/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl border-r border-zinc-200/50 dark:border-zinc-800/50 flex flex-col group overflow-hidden">
         
         <div className="h-6 shrink-0" />
         
         <nav className="flex flex-col space-y-1.5 mt-2 px-2 flex-1">
            {[
              { id: 'dashboard', icon: PieChartIcon, label: 'Overview' },
              { id: 'transactions', icon: List, label: 'Ledger' },
              { id: 'analytics', icon: BarChart2, label: 'Intelligence' },
              { id: 'reports', icon: FileText, label: 'Statements' }
            ].map(item => (
              <button 
                key={item.id} 
                onClick={() => dispatch({ type: 'NAVIGATE', payload: item.id })}
                className={cn(
                  "flex items-center h-10 rounded-[6px] transition-colors whitespace-nowrap overflow-hidden",
                  state.activePage === item.id 
                    ? "bg-zinc-200/50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium" 
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50"
                )}
              >
                <div className="w-12 flex items-center justify-center shrink-0">
                   <item.icon className="w-4 h-4" />
                </div>
                <span className="text-[13px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium pl-0.5">{item.label}</span>
              </button>
            ))}
         </nav>

         {/* Profile Section & Role Switcher */}
         <div className="py-4 flex items-center border-t border-zinc-200/50 dark:border-zinc-800/50 shrink-0 px-2 mt-auto mb-2">
           <div className="w-12 flex items-center justify-center shrink-0">
             <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-[#1E1E20] border border-zinc-300 dark:border-zinc-700/50 flex items-center justify-center font-bold text-[13px] text-zinc-900 dark:text-zinc-100 shadow-sm">
               TU
             </div>
           </div>
           <div className="flex-1 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden pr-3 pl-1 space-y-1.5">
             <button
               onClick={() => {
                 const nextRole = state.role === 'admin' ? 'viewer' : 'admin';
                 dispatch({ type: 'START_ROLE_SWITCH', payload: nextRole });
                 setTimeout(() => {
                   dispatch({ type: 'COMPLETE_ROLE_SWITCH', payload: nextRole });
                 }, 800);
               }}
               className="w-fit inline-flex items-center text-left text-[9px] px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-[#27272A] transition-all uppercase tracking-[0.1em] font-semibold shadow-sm active:scale-95"
               title="Toggle Access Level"
             >
               <ShieldCheck className="w-3 h-3 mr-1.5 opacity-80" />
               Access: {state.role}
             </button>
             <span className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate px-0.5 tracking-tight">Test User</span>
           </div>
         </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-screen">
        {/* Enterprise Top Bar */}
        <header className="h-14 border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between px-4 sm:px-6 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm shrink-0 z-10">
          
          <div className="hidden md:flex flex-1" /> 

          <div className="flex-1 flex justify-center w-full max-w-xl mx-2 sm:mx-4">
             <button onClick={() => dispatch({ type: 'TOGGLE_CMD' })} className="flex items-center justify-center text-[12px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors bg-zinc-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-[4px] w-full border border-zinc-200/50 dark:border-zinc-800">
                <Search className="w-3.5 h-3.5 mr-2.5" />
                <span>Search commands...</span>
             </button>
          </div>

          <div className="flex-1 flex items-center justify-end space-x-5">
            <button onClick={() => dispatch({ type: 'TOGGLE_DARK' })} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              {state.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full">
           <div className="w-full px-6 sm:px-10 lg:px-16 py-8 sm:py-10 h-full">
             {pages[state.activePage]}
           </div>
        </div>
      </main>

      <TransactionDrawer />
      <CommandPalette />
      <RoleSwitchOverlay />
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-10 font-sans text-zinc-100">
          <div className="bg-[#111] border border-red-900/50 p-8 rounded-[8px] max-w-2xl w-full shadow-2xl">
            <h2 className="text-red-500 text-xl font-bold mb-4 flex items-center"><X className="w-5 h-5 mr-2"/> React Runtime Error</h2>
            <p className="text-zinc-400 mb-6 text-sm">The application crashed during rendering. Below is the technical stack trace to help fix it:</p>
            <pre className="bg-black/50 p-4 rounded text-xs text-red-400 overflow-x-auto font-mono leading-relaxed border border-red-900/30">
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  );
}