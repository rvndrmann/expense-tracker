import { useState, useEffect, useMemo } from 'react'
import './App.css'

const DEFAULT_CATEGORIES = {
  income: [
    { value: 'salary', label: 'Salary', icon: '💰' },
    { value: 'freelance', label: 'Freelance', icon: '💻' },
    { value: 'investment', label: 'Investment', icon: '📈' },
    { value: 'gift', label: 'Gift', icon: '🎁' },
    { value: 'other-income', label: 'Other', icon: '💵' },
  ],
  expense: [
    { value: 'food', label: 'Food & Dining', icon: '🍔' },
    { value: 'transport', label: 'Transport', icon: '🚗' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'bills', label: 'Bills & Utilities', icon: '📄' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { value: 'health', label: 'Health', icon: '🏥' },
    { value: 'education', label: 'Education', icon: '📚' },
    { value: 'rent', label: 'Rent', icon: '🏠' },
    { value: 'other-expense', label: 'Other', icon: '📦' },
  ],
}

const EMOJI_OPTIONS = ['💰','💵','💸','💳','🏦','📈','📉','🎁','💻','🏠','🍔','🍕','☕','🚗','⛽','🚌','✈️','🛍️','👗','👟','📄','💡','📱','🎬','🎮','🎵','🏥','💊','📚','🎓','👶','🐕','🏋️','⚽','🌴','🎨','🔧','📦','🏢','💼','🤝','📊','🎉','❤️','🏡','🧾']

const BANK_ICONS = {
  icici: '🏦', sbi: '🏛️', hdfc: '🏦', axis: '🏦',
  kotak: '🏦', pnb: '🏛️', bob: '🏛️', other: '🏦',
}

const PIE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#a855f7', '#d946ef', '#0ea5e9', '#84cc16', '#f59e0b',
]

function getStored(key, fallback) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : fallback
  } catch { return fallback }
}

function formatCurrency(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Pie Chart Component ───
function PieChart({ data, colors }) {
  if (!data || data.length === 0) return null
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  const size = 200
  const cx = size / 2, cy = size / 2, r = 80
  let cumAngle = -Math.PI / 2

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI
    const startX = cx + r * Math.cos(cumAngle)
    const startY = cy + r * Math.sin(cumAngle)
    cumAngle += angle
    const endX = cx + r * Math.cos(cumAngle)
    const endY = cy + r * Math.sin(cumAngle)
    const largeArc = angle > Math.PI ? 1 : 0
    const path = data.length === 1
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`
    return { ...d, path, color: colors[i % colors.length], pct: ((d.value / total) * 100).toFixed(1) }
  })

  return (
    <div className="pie-chart-container">
      <svg viewBox={`0 0 ${size} ${size}`} className="pie-svg">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2">
            <title>{s.label}: {formatCurrency(s.value)} ({s.pct}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r="45" fill="white" />
        <text x={cx} y={cy - 8} textAnchor="middle" className="pie-total-label">Total</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="pie-total-value">{formatCurrency(total)}</text>
      </svg>
      <div className="pie-legend">
        {slices.map((s, i) => (
          <div className="pie-legend-item" key={i}>
            <span className="pie-dot" style={{ background: s.color }} />
            <span className="pie-legend-label">{s.icon} {s.label}</span>
            <span className="pie-legend-value">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Date filter helpers ───
function getStartOfWeek(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday start
  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function filterByPeriod(transactions, period) {
  const now = new Date()
  if (period === 'week') {
    const start = getStartOfWeek(now)
    return transactions.filter(t => new Date(t.date) >= start)
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return transactions.filter(t => new Date(t.date) >= start)
  }
  if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1)
    return transactions.filter(t => new Date(t.date) >= start)
  }
  return transactions
}

function App() {
  const [transactions, setTransactions] = useState(() => getStored('expense-tracker-data', []))
  const [accounts, setAccounts] = useState(() => getStored('expense-tracker-accounts', []))
  const [customCategories, setCustomCategories] = useState(() => getStored('expense-tracker-categories', { income: [], expense: [] }))
  const [type, setType] = useState('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('food')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [rightTab, setRightTab] = useState('transactions')

  // Chart state
  const [chartPeriod, setChartPeriod] = useState('month')
  const [chartType, setChartType] = useState('expense')

  // Account form state
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accName, setAccName] = useState('')
  const [accBank, setAccBank] = useState('icici')
  const [accType, setAccType] = useState('savings')
  const [accBalance, setAccBalance] = useState('')
  const [accCreditLimit, setAccCreditLimit] = useState('')
  const [editingAccountId, setEditingAccountId] = useState(null)

  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [catType, setCatType] = useState('expense')
  const [catLabel, setCatLabel] = useState('')
  const [catIcon, setCatIcon] = useState('📦')

  // Merge default + custom categories
  const CATEGORIES = useMemo(() => ({
    income: [...DEFAULT_CATEGORIES.income, ...customCategories.income],
    expense: [...DEFAULT_CATEGORIES.expense, ...customCategories.expense],
  }), [customCategories])

  function getCategoryInfo(type, cat) {
    const list = CATEGORIES[type] || []
    return list.find(c => c.value === cat) || { label: cat, icon: '📌' }
  }

  useEffect(() => { localStorage.setItem('expense-tracker-data', JSON.stringify(transactions)) }, [transactions])
  useEffect(() => { localStorage.setItem('expense-tracker-accounts', JSON.stringify(accounts)) }, [accounts])
  useEffect(() => { localStorage.setItem('expense-tracker-categories', JSON.stringify(customCategories)) }, [customCategories])
  useEffect(() => { setCategory(CATEGORIES[type]?.[0]?.value || '') }, [type, CATEGORIES])

  // ─── Transaction handlers ───
  function handleSubmit(e) {
    e.preventDefault()
    if (!description.trim() || !amount || parseFloat(amount) <= 0) return
    setTransactions(prev => [{ id: Date.now(), type, description: description.trim(), amount: parseFloat(amount), category, date }, ...prev])
    setDescription('')
    setAmount('')
    setDate(new Date().toISOString().split('T')[0])
  }

  function handleDelete(id) { setTransactions(prev => prev.filter(t => t.id !== id)) }

  // ─── Account handlers ───
  function handleAccountSubmit(e) {
    e.preventDefault()
    if (!accName.trim()) return
    const bal = parseFloat(accBalance) || 0
    const obj = {
      name: accName.trim(), bank: accBank, type: accType, balance: bal,
      creditLimit: accType === 'credit' ? (parseFloat(accCreditLimit) || 0) : 0,
    }
    if (editingAccountId) {
      setAccounts(prev => prev.map(a => a.id === editingAccountId ? { ...a, ...obj } : a))
      setEditingAccountId(null)
    } else {
      setAccounts(prev => [...prev, { id: Date.now(), ...obj }])
    }
    resetAccountForm()
  }

  function startEditAccount(acc) {
    setEditingAccountId(acc.id); setAccName(acc.name); setAccBank(acc.bank)
    setAccType(acc.type); setAccBalance(acc.balance.toString())
    setAccCreditLimit(acc.creditLimit ? acc.creditLimit.toString() : ''); setShowAccountForm(true)
  }

  function deleteAccount(id) { setAccounts(prev => prev.filter(a => a.id !== id)) }

  function resetAccountForm() {
    setShowAccountForm(false); setEditingAccountId(null)
    setAccName(''); setAccBank('icici'); setAccType('savings'); setAccBalance(''); setAccCreditLimit('')
  }

  // ─── Category handlers ───
  function handleAddCategory(e) {
    e.preventDefault()
    if (!catLabel.trim()) return
    const value = catLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
    // Check for duplicates
    if (CATEGORIES[catType].some(c => c.value === value)) return
    setCustomCategories(prev => ({
      ...prev,
      [catType]: [...prev[catType], { value, label: catLabel.trim(), icon: catIcon, custom: true }]
    }))
    setCatLabel(''); setCatIcon('📦'); setShowCategoryForm(false)
  }

  function handleDeleteCategory(catType, catValue) {
    setCustomCategories(prev => ({
      ...prev,
      [catType]: prev[catType].filter(c => c.value !== catValue)
    }))
  }

  // ─── Computed values ───
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const txBalance = totalIncome - totalExpense

  const bankAccounts = accounts.filter(a => a.type === 'savings' || a.type === 'current')
  const creditCards = accounts.filter(a => a.type === 'credit')
  const totalBankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0)
  const totalCreditUsed = creditCards.reduce((s, a) => s + a.balance, 0)
  const totalCreditLimit = creditCards.reduce((s, a) => s + a.creditLimit, 0)
  const totalAvailableCredit = totalCreditLimit - totalCreditUsed
  const totalCash = totalBankBalance

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCategory !== 'all' && t.category !== filterCategory) return false
    return true
  })

  const categoryTotals = {}
  const breakdownType = filterType === 'all' ? 'expense' : filterType
  transactions.filter(t => t.type === breakdownType).forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount
  })
  const maxCatAmount = Math.max(...Object.values(categoryTotals), 1)

  // ─── Pie chart data ───
  const chartData = useMemo(() => {
    const periodTx = filterByPeriod(transactions, chartPeriod).filter(t => t.type === chartType)
    const totals = {}
    periodTx.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount })
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => {
        const info = getCategoryInfo(chartType, cat)
        return { label: info.label, icon: info.icon, value: val }
      })
  }, [transactions, chartPeriod, chartType, CATEGORIES])

  const periodLabel = chartPeriod === 'week' ? 'This Week' : chartPeriod === 'month' ? 'This Month' : chartPeriod === 'year' ? 'This Year' : 'All Time'

  const allCategories = [...CATEGORIES.income, ...CATEGORIES.expense]

  return (
    <>
      <header>
        <h1>Expense Tracker</h1>
        <p>Track your income and expenses by category</p>
      </header>

      {/* ─── Accounts Section ─── */}
      <div className="accounts-section">
        <div className="accounts-header">
          <h2>My Accounts</h2>
          <button className="btn-add-account" onClick={() => { resetAccountForm(); setShowAccountForm(true); }}>+ Add Account</button>
        </div>

        {showAccountForm && (
          <form className="account-form" onSubmit={handleAccountSubmit}>
            <div className="account-form-grid">
              <div className="form-group">
                <label>Account Name</label>
                <input type="text" placeholder="e.g. ICICI Savings" value={accName} onChange={e => setAccName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Bank</label>
                <select value={accBank} onChange={e => setAccBank(e.target.value)}>
                  <option value="icici">ICICI</option>
                  <option value="sbi">SBI</option>
                  <option value="hdfc">HDFC</option>
                  <option value="axis">Axis</option>
                  <option value="kotak">Kotak</option>
                  <option value="pnb">PNB</option>
                  <option value="bob">BOB</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={accType} onChange={e => setAccType(e.target.value)}>
                  <option value="savings">Savings Account</option>
                  <option value="current">Current Account</option>
                  <option value="credit">Credit Card</option>
                </select>
              </div>
              <div className="form-group">
                <label>{accType === 'credit' ? 'Outstanding Balance (₹)' : 'Balance (₹)'}</label>
                <input type="number" placeholder="0.00" step="0.01" value={accBalance} onChange={e => setAccBalance(e.target.value)} required />
              </div>
              {accType === 'credit' && (
                <div className="form-group">
                  <label>Credit Limit (₹)</label>
                  <input type="number" placeholder="0.00" step="0.01" value={accCreditLimit} onChange={e => setAccCreditLimit(e.target.value)} />
                </div>
              )}
            </div>
            <div className="account-form-actions">
              <button type="submit" className="btn-submit btn-sm">{editingAccountId ? 'Update' : 'Add'} Account</button>
              <button type="button" className="btn-cancel" onClick={resetAccountForm}>Cancel</button>
            </div>
          </form>
        )}

        {accounts.length > 0 && (
          <>
            <div className="total-cash-banner">
              <div className="total-cash-main">
                <div className="total-cash-label">Total Available Cash</div>
                <div className="total-cash-amount">{formatCurrency(totalCash)}</div>
              </div>
              {creditCards.length > 0 && (
                <div className="total-cash-credit">
                  <div className="credit-stat">
                    <span className="credit-stat-label">Credit Used</span>
                    <span className="credit-stat-value used">{formatCurrency(totalCreditUsed)}</span>
                  </div>
                  <div className="credit-stat">
                    <span className="credit-stat-label">Available Credit</span>
                    <span className="credit-stat-value available">{formatCurrency(totalAvailableCredit)}</span>
                  </div>
                  <div className="credit-stat">
                    <span className="credit-stat-label">Total Limit</span>
                    <span className="credit-stat-value">{formatCurrency(totalCreditLimit)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="accounts-grid">
              {bankAccounts.length > 0 && (
                <div className="accounts-group">
                  <h3>Bank Accounts</h3>
                  {bankAccounts.map(a => (
                    <div className="account-card" key={a.id}>
                      <div className="account-card-icon bank">{BANK_ICONS[a.bank] || '🏦'}</div>
                      <div className="account-card-info">
                        <div className="account-card-name">{a.name}</div>
                        <div className="account-card-meta">{a.bank.toUpperCase()} &middot; {a.type === 'savings' ? 'Savings' : 'Current'}</div>
                      </div>
                      <div className="account-card-balance positive">{formatCurrency(a.balance)}</div>
                      <div className="account-card-actions">
                        <button className="btn-icon" onClick={() => startEditAccount(a)} title="Edit">✎</button>
                        <button className="btn-icon delete" onClick={() => deleteAccount(a.id)} title="Delete">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {creditCards.length > 0 && (
                <div className="accounts-group">
                  <h3>Credit Cards</h3>
                  {creditCards.map(a => {
                    const available = a.creditLimit - a.balance
                    const usedPct = a.creditLimit > 0 ? (a.balance / a.creditLimit) * 100 : 0
                    return (
                      <div className="account-card credit" key={a.id}>
                        <div className="account-card-icon credit-icon">💳</div>
                        <div className="account-card-info">
                          <div className="account-card-name">{a.name}</div>
                          <div className="account-card-meta">{a.bank.toUpperCase()} &middot; Limit: {formatCurrency(a.creditLimit)}</div>
                          <div className="credit-bar-track">
                            <div className="credit-bar-fill" style={{ width: `${Math.min(usedPct, 100)}%`, background: usedPct > 80 ? '#ef4444' : usedPct > 50 ? '#f97316' : '#22c55e' }} />
                          </div>
                        </div>
                        <div className="account-card-credit-info">
                          <div className="credit-used">Used: {formatCurrency(a.balance)}</div>
                          <div className="credit-available">Avail: {formatCurrency(available)}</div>
                        </div>
                        <div className="account-card-actions">
                          <button className="btn-icon" onClick={() => startEditAccount(a)} title="Edit">✎</button>
                          <button className="btn-icon delete" onClick={() => deleteAccount(a.id)} title="Delete">✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {accounts.length === 0 && !showAccountForm && (
          <div className="empty-state">No accounts added yet. Add your bank accounts and credit cards to track balances.</div>
        )}
      </div>

      {/* ─── Pie Chart Section ─── */}
      <div className="card chart-section">
        <div className="chart-header">
          <h2>Spending Overview</h2>
          <div className="chart-controls">
            <div className="tabs tabs-inline">
              {['week', 'month', 'year', 'all'].map(p => (
                <button key={p} className={chartPeriod === p ? 'active' : ''} onClick={() => setChartPeriod(p)}>
                  {p === 'week' ? 'Week' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : 'All'}
                </button>
              ))}
            </div>
            <select className="chart-type-select" value={chartType} onChange={e => setChartType(e.target.value)}>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>
        <p className="chart-period-label">{periodLabel} &middot; {chartType === 'expense' ? 'Expenses' : 'Income'}</p>
        {chartData.length > 0 ? (
          <PieChart data={chartData} colors={PIE_COLORS} />
        ) : (
          <div className="empty-state">No {chartType} data for {periodLabel.toLowerCase()}.</div>
        )}
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="summary-cards">
        <div className="summary-card balance">
          <label>Txn Balance</label>
          <div className="amount">{txBalance >= 0 ? '' : '-'}{formatCurrency(txBalance)}</div>
        </div>
        <div className="summary-card income">
          <label>Income</label>
          <div className="amount">+{formatCurrency(totalIncome)}</div>
        </div>
        <div className="summary-card expense">
          <label>Expenses</label>
          <div className="amount">-{formatCurrency(totalExpense)}</div>
        </div>
      </div>

      {/* ─── Main Grid ─── */}
      <div className="main-grid">
        <div>
          {/* Add Transaction */}
          <div className="card">
            <h2>Add Transaction</h2>
            <form onSubmit={handleSubmit}>
              <div className="type-toggle">
                <button type="button" className={type === 'income' ? 'active-income' : ''} onClick={() => setType('income')}>Income</button>
                <button type="button" className={type === 'expense' ? 'active-expense' : ''} onClick={() => setType('expense')}>Expense</button>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" placeholder="e.g. Grocery shopping" value={description} onChange={e => setDescription(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input type="number" placeholder="0.00" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES[type].map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <button type="submit" className="btn-submit">Add {type === 'income' ? 'Income' : 'Expense'}</button>
            </form>
          </div>

          {/* Manage Categories */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="accounts-header">
              <h2>Categories</h2>
              <button className="btn-add-account" onClick={() => setShowCategoryForm(!showCategoryForm)}>+ Add Category</button>
            </div>

            {showCategoryForm && (
              <form className="account-form" onSubmit={handleAddCategory}>
                <div className="form-group">
                  <label>Type</label>
                  <select value={catType} onChange={e => setCatType(e.target.value)}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" placeholder="e.g. Subscriptions" value={catLabel} onChange={e => setCatLabel(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Icon</label>
                  <div className="emoji-grid">
                    {EMOJI_OPTIONS.map(e => (
                      <button type="button" key={e} className={`emoji-btn ${catIcon === e ? 'selected' : ''}`} onClick={() => setCatIcon(e)}>{e}</button>
                    ))}
                  </div>
                </div>
                <div className="account-form-actions">
                  <button type="submit" className="btn-submit btn-sm">Add Category</button>
                  <button type="button" className="btn-cancel" onClick={() => setShowCategoryForm(false)}>Cancel</button>
                </div>
              </form>
            )}

            <div className="category-manage-list">
              <h4>Expense</h4>
              <div className="cat-chips">
                {CATEGORIES.expense.map(c => (
                  <span className="cat-chip" key={c.value}>
                    {c.icon} {c.label}
                    {c.custom && <button className="cat-chip-delete" onClick={() => handleDeleteCategory('expense', c.value)}>✕</button>}
                  </span>
                ))}
              </div>
              <h4 style={{ marginTop: 12 }}>Income</h4>
              <div className="cat-chips">
                {CATEGORIES.income.map(c => (
                  <span className="cat-chip" key={c.value}>
                    {c.icon} {c.label}
                    {c.custom && <button className="cat-chip-delete" onClick={() => handleDeleteCategory('income', c.value)}>✕</button>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="card">
          <div className="tabs">
            <button className={rightTab === 'transactions' ? 'active' : ''} onClick={() => setRightTab('transactions')}>Transactions</button>
            <button className={rightTab === 'categories' ? 'active' : ''} onClick={() => setRightTab('categories')}>By Category</button>
          </div>

          {rightTab === 'transactions' && (
            <>
              <div className="filter-bar">
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterCategory('all'); }}>
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="all">All Categories</option>
                  {(filterType === 'all' ? allCategories : CATEGORIES[filterType]).map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="transaction-list">
                {filtered.length === 0 && <div className="empty-state">No transactions yet. Add one to get started!</div>}
                {filtered.map(t => {
                  const info = getCategoryInfo(t.type, t.category)
                  return (
                    <div className="transaction-item" key={t.id}>
                      <div className={`transaction-icon ${t.type}`}>{info.icon}</div>
                      <div className="transaction-info">
                        <div className="desc">{t.description}</div>
                        <div className="meta">{info.label} &middot; {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                      <div className={`transaction-amount ${t.type}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </div>
                      <button className="btn-delete" onClick={() => handleDelete(t.id)} title="Delete">✕</button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {rightTab === 'categories' && (
            <div className="category-breakdown">
              <div className="filter-bar">
                <select value={filterType === 'all' ? 'expense' : filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="expense">Expense Categories</option>
                  <option value="income">Income Categories</option>
                </select>
              </div>
              {Object.keys(categoryTotals).length === 0 && <div className="empty-state">No {breakdownType} data yet.</div>}
              {Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, total], i) => {
                  const info = getCategoryInfo(breakdownType, cat)
                  return (
                    <div className="category-item" key={cat}>
                      <div className="cat-icon">{info.icon}</div>
                      <div className="cat-info">
                        <div className="cat-name">{info.label}</div>
                        <div className="cat-bar-track">
                          <div className="cat-bar-fill" style={{ width: `${(total / maxCatAmount) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        </div>
                      </div>
                      <div className="cat-amount">{formatCurrency(total)}</div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default App
