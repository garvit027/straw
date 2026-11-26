import { useEffect, useState } from 'react';
import {
  BarChart3, CalendarDays, AlertTriangle, SlidersHorizontal, Database, BookOpen,
  Sparkles, RotateCcw, Download, Menu, X, CheckCircle2,
} from 'lucide-react';
import { useApp } from './store/AppContext';
import { monthOptions, monthLabel } from './utils/date';
import { rosterToCSV, downloadCSV } from './utils/csv';
import Overview from './components/Overview';
import RosterViews from './components/RosterViews';
import Conflicts from './components/Conflicts';
import ChangeSimulator from './components/ChangeSimulator';
import DataManager from './components/DataManager';
import Approach from './components/Approach';

type Page = 'overview' | 'roster' | 'conflicts' | 'changes' | 'data' | 'approach';

const NAV: Array<{ id: Page; label: string; icon: typeof BarChart3 }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'roster', label: 'Roster views', icon: CalendarDays },
  { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle },
  { id: 'changes', label: 'Change simulator', icon: SlidersHorizontal },
  { id: 'data', label: 'Setup & data', icon: Database },
  { id: 'approach', label: 'Approach', icon: BookOpen },
];

export default function App() {
  const { state, generate, reset } = useApp();
  const [page, setPage] = useState<Page>('overview');
  const [navOpen, setNavOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!state.roster) generate(state.rosterMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const generateWithFeedback = (month?: string) => {
    const target = month ?? state.rosterMonth;
    generate(target);
    setMessage(`Roster generated for ${monthLabel(target)}`);
  };

  const mandatory = state.roster?.conflicts.filter((c) => c.mandatory).length ?? 0;

  const exportCSV = () => {
    if (!state.roster) return;
    downloadCSV(`roster-${state.roster.month}.csv`, rosterToCSV(state, state.roster));
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div>
            <div className="brand-name">Smart Roster</div>
            <div className="brand-sub">Datastraw assessment</div>
          </div>
          <button className="icon-btn mobile-only" onClick={() => setNavOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav className="nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => { setPage(item.id); setNavOpen(false); }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.id === 'conflicts' && mandatory > 0 && <span className="nav-badge">{mandatory}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="avatar">GJ</div>
          <div>
            <div className="foot-name">Garvit Juneja</div>
            <div className="foot-sub">AI + Tech Intern</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn mobile-only" onClick={() => setNavOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="topbar-title">
            <h1>{NAV.find((n) => n.id === page)?.label}</h1>
            <span>
              {state.roster
                ? `Last generated ${new Date(state.roster.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Monthly operations planning workspace'}
            </span>
          </div>
          <div className="topbar-actions">
            <select
              className="month-select"
              value={state.rosterMonth}
              onChange={(e) => generateWithFeedback(e.target.value)}
              title="Select planning month"
            >
              {monthOptions(state.rosterMonth).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={reset} title="Restore the original sample dataset"><RotateCcw size={15} /> Reset</button>
            <button className="btn btn-ghost" onClick={exportCSV} disabled={!state.roster} title="Download roster as CSV"><Download size={15} /> CSV</button>
            <button className="btn btn-primary" onClick={() => generateWithFeedback()}><Sparkles size={15} /> Generate roster</button>
          </div>
        </header>

        {message && (
          <div className="toast toast-floating" role="status" aria-live="polite">
            <CheckCircle2 size={16} /> {message}
            <button onClick={() => setMessage('')} aria-label="Dismiss notification">×</button>
          </div>
        )}

        <div className="content">
          {page === 'overview' && <Overview onNavigate={setPage} />}
          {page === 'roster' && <RosterViews />}
          {page === 'conflicts' && <Conflicts />}
          {page === 'changes' && <ChangeSimulator />}
          {page === 'data' && <DataManager />}
          {page === 'approach' && <Approach />}
        </div>
      </main>
    </div>
  );
}
