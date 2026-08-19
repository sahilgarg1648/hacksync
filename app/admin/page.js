'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, RadialBarChart, RadialBar, Legend,
} from 'recharts';
import {
  LayoutDashboard, Users, Layers, Trophy, Flag, BarChart3, ShieldCheck,
  Bell, Brain, FileText, Lock, Settings, Search, Sparkles, LogOut,
  ChevronLeft, ChevronRight, Menu, X, Plus, MoreVertical, Trash2,
  Edit, Check, AlertTriangle, TrendingUp, TrendingDown, Activity,
  Loader2, ShieldAlert, Eye, UserCheck, UserX, Send, Shield, ChevronDown,
  Calendar, Github, Linkedin, Mail, Globe, Cpu, Zap, Award,
} from 'lucide-react';

const api = async (path, opts = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem('token');
      if (typeof window !== 'undefined') window.location.href = '/';
    }
    throw new Error(data.error || 'Request failed');
  }
  return data;
};

const NAV = [
  { k: 'overview', l: 'Dashboard', i: LayoutDashboard },
  { k: 'users', l: 'Users', i: Users },
  { k: 'teams', l: 'Teams', i: Layers },
  { k: 'hackathons', l: 'Hackathons', i: Trophy },
  { k: 'reports', l: 'Reports & Moderation', i: Flag },
  { k: 'analytics', l: 'Analytics', i: BarChart3 },
  { k: 'verification', l: 'Verification', i: ShieldCheck },
  { k: 'notifications', l: 'Notifications', i: Bell },
  { k: 'matching', l: 'AI Matching', i: Brain },
  { k: 'cms', l: 'Content (CMS)', i: FileText },
  { k: 'security', l: 'Security', i: Lock },
  { k: 'rbac', l: 'Roles (RBAC)', i: Shield },
  { k: 'settings', l: 'Settings', i: Settings },
];

const Orbs = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 grid-pattern" />
  </div>
);

export default function AdminPage() {
  const router = useRouter();
  const [view, setView] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.replace('/'); return; }
    api('/admin/me')
      .then((d) => { setAdmin(d.user); setLoading(false); })
      .catch(() => { toast.error('Admin access required'); router.replace('/'); });
  }, [router]);

  // ⌘K palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(true); }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Orbs />
      <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
    </div>
  );

  const current = NAV.find((n) => n.k === view) || NAV[0];

  return (
    <div className="min-h-screen flex">
      <Orbs />

      {/* SIDEBAR */}
      <aside className={`${collapsed ? 'w-[70px]' : 'w-[240px]'} hidden md:flex flex-col fixed left-0 top-0 h-screen z-30 glass-strong border-r border-neutral-100 transition-all`}>
        <div className="p-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            {!collapsed && <div><div className="font-bold tracking-tight leading-tight">HackSync</div><div className="text-[10px] text-neutral-700">Admin</div></div>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="text-neutral-400 hover:text-neutral-900">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto scroll-hide">
          {NAV.map((n) => (
            <button key={n.k} onClick={() => setView(n.k)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${view === n.k ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'}`}
              title={collapsed ? n.l : ''}>
              <n.i className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{n.l}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-neutral-100">
          <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
            <Avatar className="w-8 h-8 ring-1 ring-indigo-500/40"><AvatarFallback>{admin?.name?.[0] || 'A'}</AvatarFallback></Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{admin?.name}</div>
                <div className="text-[10px] text-neutral-400 truncate">Super Admin</div>
              </div>
            )}
            {!collapsed && <Button size="icon" variant="ghost" onClick={() => router.push('/')} className="w-7 h-7 text-neutral-400 hover:text-neutral-900"><LogOut className="w-3.5 h-3.5" /></Button>}
          </div>
        </div>
      </aside>

      {/* MOBILE SIDEBAR */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} className="fixed left-0 top-0 h-screen w-[240px] z-50 glass-strong md:hidden flex flex-col">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div><div><div className="font-bold">HackSync</div><div className="text-[10px] text-neutral-700">Admin</div></div></div>
                <button onClick={() => setMobileOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto scroll-hide">
                {NAV.map((n) => (
                  <button key={n.k} onClick={() => { setView(n.k); setMobileOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${view === n.k ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500'}`}>
                    <n.i className="w-4 h-4" /><span>{n.l}</span>
                  </button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN */}
      <div className={`flex-1 ${collapsed ? 'md:ml-[70px]' : 'md:ml-[240px]'} transition-all`}>
        {/* TOP NAV */}
        <header className="sticky top-0 z-20 glass border-b border-neutral-100 px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden text-neutral-500"><Menu className="w-5 h-5" /></button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-400">Admin</span>
              <ChevronRight className="w-3 h-3 text-neutral-400" />
              <span className="font-semibold flex items-center gap-1.5"><current.i className="w-3.5 h-3.5 text-neutral-500" /> {current.l}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPaletteOpen(true)} className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-100 text-xs text-neutral-500 border border-neutral-100">
              <Search className="w-3.5 h-3.5" /> Search...
              <kbd className="ml-2 text-[9px] px-1.5 py-0.5 bg-neutral-100 rounded">⌘K</kbd>
            </button>
            <Button size="icon" variant="ghost" className="text-neutral-500 hover:text-neutral-900 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full" />
            </Button>
            <Avatar className="w-8 h-8 ring-1 ring-indigo-500/40"><AvatarFallback>{admin?.name?.[0] || 'A'}</AvatarFallback></Avatar>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-[1500px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {view === 'overview' && <Overview />}
              {view === 'users' && <UsersPanel />}
              {view === 'teams' && <TeamsPanel />}
              {view === 'hackathons' && <HackathonsPanel />}
              {view === 'reports' && <ReportsPanel />}
              {view === 'analytics' && <AnalyticsPanel />}
              {view === 'verification' && <VerificationPanel />}
              {view === 'notifications' && <NotificationsPanel />}
              {view === 'matching' && <MatchingPanel />}
              {view === 'cms' && <CMSPanel />}
              {view === 'security' && <SecurityPanel />}
              {view === 'rbac' && <RBACPanel />}
              {view === 'settings' && <SettingsPanel />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* COMMAND PALETTE */}
      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent className="sm:max-w-lg glass-strong border-neutral-200 p-0 overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-neutral-400" />
            <input autoFocus placeholder="Jump to..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none text-sm flex-1" />
            <kbd className="text-[10px] px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500">ESC</kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {NAV.filter((n) => !search || n.l.toLowerCase().includes(search.toLowerCase())).map((n) => (
              <button key={n.k} onClick={() => { setView(n.k); setPaletteOpen(false); setSearch(''); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 text-sm">
                <n.i className="w-4 h-4 text-neutral-500" /><span>{n.l}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====================================================================
// REUSABLE
// ====================================================================
const StatCard = ({ label, value, icon: I, color, change, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} whileHover={{ y: -2 }}
    className="glass rounded-2xl p-5 relative overflow-hidden group">
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}><I className="w-4 h-4" /></div>
        {change !== undefined && (
          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
    </div>
  </motion.div>
);

const Header = ({ title, subtitle, action }) => (
  <div className="flex items-end justify-between mb-6">
    <div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Skeleton = ({ className = 'h-32' }) => <div className={`glass rounded-2xl ${className} animate-pulse`} />;

// ====================================================================
// 1. OVERVIEW
// ====================================================================
const Overview = () => {
  const [data, setData] = useState(null);
  useEffect(() => { api('/admin/overview').then(setData).catch((e) => toast.error(e.message)); }, []);
  if (!data) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;

  const stats = [
    { label: 'Total Users', value: data.totalUsers, icon: Users, color: 'from-neutral-100 to-neutral-100', change: data.growthPct },
    { label: 'Active Today', value: data.activeToday, icon: Activity, color: 'from-neutral-100 to-neutral-100' },
    { label: 'Teams Created', value: data.teams, icon: Layers, color: 'from-neutral-100 to-neutral-100' },
    { label: 'Ongoing Hackathons', value: data.hackathons, icon: Trophy, color: 'from-neutral-100 to-neutral-100' },
    { label: 'Pending Reports', value: data.pendingReports, icon: Flag, color: 'from-neutral-100 to-neutral-100' },
    { label: 'Pending Verifications', value: data.pendingVerifications, icon: ShieldCheck, color: 'from-neutral-100 to-neutral-100' },
    { label: 'Platform Growth', value: `${data.growthPct}%`, icon: TrendingUp, color: 'from-neutral-100 to-neutral-100', change: data.growthPct },
  ];
  return (
    <div className="space-y-6">
      <Header title="Dashboard" subtitle="Real-time overview of your platform's health and activity." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{stats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.04} />)}</div>

      {/* User Growth + Activity */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-bold">User Growth</h3><p className="text-xs text-neutral-500">New signups per day, last 14 days</p></div>
            <Badge className="bg-green-500/20 text-green-600 border-0">+{data.growthPct}% vs last month</Badge>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.growth}>
              <defs>
                <linearGradient id="growthArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="day" stroke="rgba(0,0,0,0.35)" fontSize={10} />
              <YAxis stroke="rgba(0,0,0,0.35)" fontSize={10} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(0,0,0,0.08)', color: '#171717', borderRadius: 8 }} />
              <Area type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={2} fill="url(#growthArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4">Live Activity</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto scroll-hide">
            {(data.recentActivity || []).map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-start gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.type === 'team' ? 'bg-neutral-400' : 'bg-neutral-400'}`} />
                <div className="flex-1"><div className="text-neutral-700">{a.text}</div><div className="text-neutral-400 text-[10px] mt-0.5">{new Date(a.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>
              </motion.div>
            ))}
            {(!data.recentActivity || data.recentActivity.length === 0) && <div className="text-neutral-400 text-sm">No recent activity</div>}
          </div>
        </div>
      </div>

      {/* Top Skills + Top Colleges + Recent Registrations */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Cpu className="w-4 h-4 text-neutral-500" /> Top Skills</h3>
          <div className="space-y-2">
            {data.topSkills.slice(0, 6).map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="text-xs w-24 truncate">{s.name}</span>
                <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / data.topSkills[0].count) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.6 }}
                    className="h-full bg-indigo-600" />
                </div>
                <span className="text-xs text-neutral-500 w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-neutral-500" /> Top Colleges</h3>
          <div className="space-y-2">
            {data.topColleges.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between">
                <span className="text-xs truncate flex-1">{c.name}</span>
                <Badge className="bg-neutral-100 text-neutral-700 border-0 text-[10px]">{c.count}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><UserCheck className="w-4 h-4 text-neutral-500" /> Recent Registrations</h3>
          <div className="space-y-2">
            {data.recentRegistrations.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center gap-2">
                <Avatar className="w-7 h-7"><AvatarImage src={u.avatar} /><AvatarFallback className="text-[10px]">{u.name?.[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0"><div className="text-xs font-semibold truncate">{u.name}</div><div className="text-[10px] text-neutral-400 truncate">{u.college || 'No college'}</div></div>
                <span className="text-[10px] text-neutral-400">{u.createdAt && new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// 2. USERS
// ====================================================================
const UsersPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [bulk, setBulk] = useState(new Set());

  const load = () => {
    setLoading(true);
    api('/admin/users').then((d) => setUsers(d.users)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => users.filter((u) => {
    if (filter === 'verified' && !u.verified) return false;
    if (filter === 'unverified' && u.verified) return false;
    if (filter === 'banned' && u.status !== 'banned') return false;
    if (filter === 'suspended' && u.status !== 'suspended') return false;
    if (search) {
      const q = search.toLowerCase();
      return [u.name, u.email, u.college].some((f) => f?.toLowerCase().includes(q));
    }
    return true;
  }), [users, search, filter]);

  const action = async (id, body, msg) => {
    try { await api(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); toast.success(msg || 'Done'); load(); }
    catch (e) { toast.error(e.message); }
  };
  const del = async (id) => {
    if (!confirm('Delete this user permanently?')) return;
    try { await api(`/admin/users/${id}`, { method: 'DELETE' }); toast.success('User deleted'); setSelected(null); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-5">
      <Header title="User Management" subtitle={`${users.length} total users · ${filtered.length} matching filters`} />
      <div className="glass rounded-2xl p-3 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input placeholder="Search by name, email, college..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-neutral-100 border-neutral-200" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[['all', 'All'], ['verified', 'Verified'], ['unverified', 'Unverified'], ['banned', 'Banned'], ['suspended', 'Suspended']].map(([k, l]) => (
            <Button key={k} size="sm" onClick={() => setFilter(k)} className={filter === k ? 'gradient-button text-white border-0' : 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:bg-neutral-100'} variant={filter === k ? 'default' : 'outline'}>{l}</Button>
          ))}
        </div>
        {bulk.size > 0 && <Button size="sm" variant="outline" className="bg-red-500/10 border-red-500/30 text-red-600">Delete {bulk.size}</Button>}
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-white/[0.02]">
              <tr className="text-xs text-neutral-500 uppercase tracking-wider">
                <th className="p-3 text-left w-8"><input type="checkbox" onChange={(e) => setBulk(e.target.checked ? new Set(filtered.map((u) => u.id)) : new Set())} /></th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left hidden md:table-cell">College</th>
                <th className="p-3 text-left hidden lg:table-cell">Skills</th>
                <th className="p-3 text-left hidden md:table-cell">Status</th>
                <th className="p-3 text-left hidden lg:table-cell">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan="7" className="p-4"><div className="h-10 bg-neutral-100 rounded animate-pulse" /></td></tr>)
              : filtered.slice(0, 50).map((u) => (
                <tr key={u.id} className="border-b border-neutral-100 hover:bg-white/[0.03] transition group">
                  <td className="p-3"><input type="checkbox" checked={bulk.has(u.id)} onChange={(e) => { const n = new Set(bulk); e.target.checked ? n.add(u.id) : n.delete(u.id); setBulk(n); }} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-8 h-8 flex-shrink-0"><AvatarImage src={u.avatar} /><AvatarFallback>{u.name?.[0]}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold flex items-center gap-1">
                          <span className="truncate">{u.name}</span>
                          {u.verified && <ShieldCheck className="w-3 h-3 text-neutral-500 flex-shrink-0" />}
                          {u.isAdmin && <Shield className="w-3 h-3 text-amber-700 flex-shrink-0" />}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-neutral-600 hidden md:table-cell"><span className="truncate block max-w-[120px]">{u.college || '—'}</span></td>
                  <td className="p-3 hidden lg:table-cell"><div className="flex gap-1 flex-wrap max-w-[180px]">{(u.skills || []).slice(0, 3).map((s) => <Badge key={s} className="bg-neutral-100 text-neutral-600 border-0 text-[9px]">{s}</Badge>)}</div></td>
                  <td className="p-3 hidden md:table-cell">
                    <Badge className={`text-[10px] border-0 ${u.status === 'banned' ? 'bg-red-500/20 text-red-600' : u.status === 'suspended' ? 'bg-amber-500/20 text-amber-700' : 'bg-green-500/20 text-green-600'}`}>
                      {u.status || 'active'}
                    </Badge>
                  </td>
                  <td className="p-3 text-neutral-500 text-xs hidden lg:table-cell">{u.createdAt && new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => setSelected(u)} className="w-7 h-7 text-neutral-500 hover:text-neutral-900"><MoreVertical className="w-3.5 h-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md glass-strong border-neutral-200">
          {selected && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-14 h-14"><AvatarImage src={selected.avatar} /><AvatarFallback>{selected.name?.[0]}</AvatarFallback></Avatar>
                <div><h3 className="font-bold">{selected.name}</h3><p className="text-xs text-neutral-500">{selected.email}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div className="glass rounded-lg p-2"><div className="text-neutral-400">College</div><div className="font-semibold truncate">{selected.college || '—'}</div></div>
                <div className="glass rounded-lg p-2"><div className="text-neutral-400">Status</div><div className="font-semibold capitalize">{selected.status || 'active'}</div></div>
                <div className="glass rounded-lg p-2"><div className="text-neutral-400">Verified</div><div className="font-semibold">{selected.verified ? 'Yes' : 'No'}</div></div>
                <div className="glass rounded-lg p-2"><div className="text-neutral-400">Reports</div><div className="font-semibold">{selected.reports || 0}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={() => action(selected.id, { verified: !selected.verified }, 'Verification toggled')} className="bg-neutral-100 border-neutral-200" variant="outline"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> {selected.verified ? 'Un-verify' : 'Verify'}</Button>
                <Button size="sm" onClick={() => action(selected.id, { status: selected.status === 'suspended' ? 'active' : 'suspended' }, 'Status updated')} className="bg-neutral-100 border-neutral-200" variant="outline"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> {selected.status === 'suspended' ? 'Unsuspend' : 'Suspend'}</Button>
                <Button size="sm" onClick={() => action(selected.id, { status: 'banned' }, 'User banned')} className="bg-red-500/10 border-red-500/30 text-red-600" variant="outline"><UserX className="w-3.5 h-3.5 mr-1" /> Ban</Button>
                <Button size="sm" onClick={() => action(selected.id, { isAdmin: !selected.isAdmin }, selected.isAdmin ? 'Demoted' : 'Promoted to admin')} className="bg-amber-500/10 border-amber-500/30 text-amber-700" variant="outline"><Shield className="w-3.5 h-3.5 mr-1" /> {selected.isAdmin ? 'Demote' : 'Promote'}</Button>
                <Button size="sm" onClick={() => del(selected.id)} className="col-span-2 bg-red-500/20 border-red-500/40 text-red-600 hover:bg-red-500/30" variant="outline"><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete user</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ====================================================================
// 3. TEAMS
// ====================================================================
const TeamsPanel = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api('/admin/teams').then((d) => setTeams(d.teams)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);
  const action = async (id, body) => { try { await api(`/admin/teams/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); toast.success('Updated'); load(); } catch (e) { toast.error(e.message); } };
  const del = async (id) => { if (!confirm('Delete this team?')) return; try { await api(`/admin/teams/${id}`, { method: 'DELETE' }); toast.success('Team deleted'); load(); } catch (e) { toast.error(e.message); } };

  return (
    <div className="space-y-5">
      <Header title="Team Moderation" subtitle={`${teams.length} teams across the platform`} />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        {teams.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="glass rounded-2xl p-5 relative">
            {t.featured && <Badge className="absolute top-3 right-3 bg-amber-500/20 text-amber-700 border-0 text-[10px]">Featured</Badge>}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><Layers className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0"><div className="font-bold truncate">{t.name}</div><div className="text-xs text-neutral-500">{t.members?.length || 0} members</div></div>
            </div>
            <p className="text-xs text-neutral-500 line-clamp-2 mb-3 min-h-[2rem]">{t.description || 'No description'}</p>
            <div className="flex gap-1">
              <Button size="sm" onClick={() => action(t.id, { featured: !t.featured })} className="bg-neutral-100 border-neutral-200 flex-1 text-xs" variant="outline"><Award className="w-3 h-3 mr-1" /> {t.featured ? 'Unfeature' : 'Feature'}</Button>
              <Button size="sm" onClick={() => action(t.id, { locked: !t.locked })} className="bg-neutral-100 border-neutral-200 text-xs" variant="outline"><Lock className="w-3 h-3" /></Button>
              <Button size="sm" onClick={() => del(t.id)} className="bg-red-500/10 border-red-500/30 text-red-600 text-xs" variant="outline"><Trash2 className="w-3 h-3" /></Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ====================================================================
// 4. HACKATHONS
// ====================================================================
const HackathonsPanel = () => {
  const [hackathons, setHackathons] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const load = () => { api('/admin/hackathons').then((d) => setHackathons(d.hackathons)).catch(() => {}); };
  useEffect(() => { load(); }, []);
  const pendingCount = hackathons.filter((h) => h.verified === false).length;
  const filtered = hackathons.filter((h) => filter === 'all' || (filter === 'pending' ? h.verified === false : h.verified !== false));
  const save = async (data) => {
    try {
      if (editing?.id) await api(`/admin/hackathons/${editing.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      else await api('/admin/hackathons', { method: 'POST', body: JSON.stringify(data) });
      toast.success('Saved'); setEditing(null); setCreating(false); load();
    } catch (e) { toast.error(e.message); }
  };
  const del = async (id) => { if (!confirm('Delete?')) return; try { await api(`/admin/hackathons/${id}`, { method: 'DELETE' }); toast.success('Deleted'); load(); } catch (e) { toast.error(e.message); } };
  const approve = async (id) => { try { await api(`/admin/hackathons/${id}`, { method: 'PATCH', body: JSON.stringify({ verified: true }) }); toast.success('Approved — now live'); load(); } catch (e) { toast.error(e.message); } };
  const reject = async (id) => { if (!confirm('Reject and delete this submission?')) return; try { await api(`/admin/hackathons/${id}`, { method: 'DELETE' }); toast.success('Rejected'); load(); } catch (e) { toast.error(e.message); } };

  return (
    <div className="space-y-5">
      <Header title="Hackathon Management" subtitle="Add hackathons directly, or review ones submitted by users" action={
        <Button onClick={() => { setEditing({}); setCreating(true); }} className="gradient-button text-white border-0"><Plus className="w-4 h-4 mr-1" /> Add hackathon</Button>
      } />
      <div className="flex gap-1">
        {[['all', 'All'], ['pending', `Pending (${pendingCount})`], ['verified', 'Verified']].map(([k, l]) => (
          <Button key={k} size="sm" onClick={() => setFilter(k)} className={filter === k ? 'gradient-button text-white border-0' : 'bg-neutral-100 border-neutral-200'} variant={filter === k ? 'default' : 'outline'}>{l}</Button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((h, i) => (
          <motion.div key={h.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass rounded-2xl overflow-hidden">
            <div className="relative h-32">
              {h.banner ? <img src={h.banner} alt={h.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-neutral-200 flex items-center justify-center"><Trophy className="w-8 h-8 text-neutral-400" /></div>}
              <Badge className="absolute top-2 right-2 bg-neutral-900/80 text-white border-0">{h.tag}</Badge>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2"><div><h3 className="font-bold">{h.name}</h3><p className="text-xs text-neutral-500">{h.domain} · {h.deadline}</p></div><div className="font-bold gradient-text">{h.prize}</div></div>
              <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-500 mb-3">
                <span><Users className="w-3 h-3 inline mr-1" />{h.participants}</span>
                <Badge className="bg-green-500/20 text-green-600 border-0 text-[9px] capitalize">{h.status || 'active'}</Badge>
                {h.college && <Badge className="bg-neutral-100 text-neutral-700 border-0 text-[9px]">{h.college}</Badge>}
                {h.verified === false
                  ? <Badge className="bg-amber-500/20 text-amber-700 border-0 text-[9px]">Pending review</Badge>
                  : <Badge className="bg-neutral-100 text-neutral-500 border-0 text-[9px]">Verified</Badge>}
              </div>
              {h.submitterName && <div className="text-[10px] text-neutral-400 mb-3">Submitted by {h.submitterName}</div>}
              {h.verified === false ? (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => approve(h.id)} className="gradient-button text-white border-0 flex-1 text-xs"><Check className="w-3 h-3 mr-1" /> Approve</Button>
                  <Button size="sm" onClick={() => reject(h.id)} variant="outline" className="bg-red-500/10 border-red-500/30 text-red-600 text-xs"><X className="w-3 h-3 mr-1" /> Reject</Button>
                  <Button size="sm" onClick={() => setEditing(h)} variant="outline" className="bg-neutral-100 border-neutral-200 text-xs"><Edit className="w-3 h-3" /></Button>
                </div>
              ) : (
                <div className="flex gap-1"><Button size="sm" onClick={() => setEditing(h)} variant="outline" className="bg-neutral-100 border-neutral-200 flex-1 text-xs"><Edit className="w-3 h-3 mr-1" /> Edit</Button><Button size="sm" onClick={() => del(h.id)} variant="outline" className="bg-red-500/10 border-red-500/30 text-red-600 text-xs"><Trash2 className="w-3 h-3" /></Button></div>
              )}
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <div className="md:col-span-2 glass rounded-2xl p-8 text-center text-neutral-500">Nothing here</div>}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="sm:max-w-lg glass-strong border-neutral-200">
          {editing && <HackathonForm initial={editing} onSave={save} isNew={creating} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const HackathonForm = ({ initial, onSave, isNew }) => {
  const [d, setD] = useState({ name: '', banner: '', domain: '', prize: '', deadline: '', participants: '0', tag: 'New', status: 'active', college: '', description: '', ...initial });
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">{isNew ? 'New hackathon' : 'Edit hackathon'}</h2>
      <Input placeholder="Name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className="bg-neutral-100 border-neutral-200" />
      <Textarea placeholder="Description (shown on the hackathon's detail page)" rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} className="bg-neutral-100 border-neutral-200" />
      <Input placeholder="Banner image URL" value={d.banner} onChange={(e) => setD({ ...d, banner: e.target.value })} className="bg-neutral-100 border-neutral-200" />
      <Input placeholder="College (optional — leave blank if not campus-specific)" value={d.college} onChange={(e) => setD({ ...d, college: e.target.value })} className="bg-neutral-100 border-neutral-200" />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Domain (AI, Web3...)" value={d.domain} onChange={(e) => setD({ ...d, domain: e.target.value })} className="bg-neutral-100 border-neutral-200" />
        <Input placeholder="Prize ($50,000)" value={d.prize} onChange={(e) => setD({ ...d, prize: e.target.value })} className="bg-neutral-100 border-neutral-200" />
        <Input placeholder="Deadline (2026-09-01)" value={d.deadline} onChange={(e) => setD({ ...d, deadline: e.target.value })} className="bg-neutral-100 border-neutral-200" />
        <Input placeholder="Participants (2.4k)" value={d.participants} onChange={(e) => setD({ ...d, participants: e.target.value })} className="bg-neutral-100 border-neutral-200" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={d.tag} onChange={(e) => setD({ ...d, tag: e.target.value })} className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-2 text-sm">
          <option>Featured</option><option>Trending</option><option>New</option><option>Open</option>
        </select>
        <select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })} className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-2 text-sm">
          <option value="active">active</option><option value="upcoming">upcoming</option><option value="closed">closed</option>
        </select>
      </div>
      <Button onClick={() => onSave(d)} className="w-full gradient-button text-white border-0">{isNew ? 'Create (auto-verified)' : 'Save changes'}</Button>
    </div>
  );
};

// ====================================================================
// 5. REPORTS
// ====================================================================
const ReportsPanel = () => {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending');
  useEffect(() => { api('/admin/reports').then((d) => setReports(d.reports)).catch(() => {}); }, []);
  const filtered = reports.filter((r) => filter === 'all' || r.status === filter);
  const handle = async (id, status, action) => {
    try { await api(`/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status, action }) }); toast.success('Resolved'); api('/admin/reports').then((d) => setReports(d.reports)); }
    catch (e) { toast.error(e.message); }
  };
  const sevColor = { critical: 'bg-red-500/20 text-red-600', high: 'bg-neutral-100 text-neutral-700', medium: 'bg-amber-500/20 text-amber-700', low: 'bg-neutral-100 text-neutral-700' };

  return (
    <div className="space-y-5">
      <Header title="Reports & Moderation" subtitle="Review user reports and take action" />
      <div className="flex gap-1">
        {[['pending', 'Pending'], ['resolved', 'Resolved'], ['all', 'All']].map(([k, l]) => (
          <Button key={k} size="sm" onClick={() => setFilter(k)} className={filter === k ? 'gradient-button text-white border-0' : 'bg-neutral-100 border-neutral-200'} variant={filter === k ? 'default' : 'outline'}>{l} ({reports.filter((r) => k === 'all' || r.status === k).length})</Button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="glass rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10"><AvatarImage src={r.targetAvatar} /><AvatarFallback>{r.targetName?.[0]}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm">{r.targetName}</span>
                  <Badge className={`${sevColor[r.severity]} border-0 text-[10px] capitalize`}>{r.severity}</Badge>
                  <Badge className="bg-neutral-100 text-neutral-700 border-0 text-[10px]">{r.reason}</Badge>
                  {r.status === 'resolved' && <Badge className="bg-green-500/20 text-green-600 border-0 text-[10px]">resolved</Badge>}
                </div>
                <p className="text-xs text-neutral-500 mb-2">{r.description}</p>
                <div className="text-[10px] text-neutral-400">Reported by <span className="text-neutral-500">{r.reporterName}</span> · {new Date(r.createdAt).toLocaleString()}</div>
                {r.aiSuggestion && <Badge className="bg-neutral-100 text-neutral-700 border-0 text-[10px] mt-2"><Brain className="w-2.5 h-2.5 mr-1" /> AI: {r.aiSuggestion}</Badge>}
              </div>
              {r.status === 'pending' && (
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={() => handle(r.id, 'resolved', 'warned')} className="gradient-button text-white border-0 text-xs">Warn</Button>
                  <Button size="sm" onClick={() => handle(r.id, 'resolved', 'banned')} variant="outline" className="bg-red-500/10 border-red-500/30 text-red-600 text-xs">Ban</Button>
                  <Button size="sm" onClick={() => handle(r.id, 'dismissed', 'dismissed')} variant="outline" className="bg-neutral-100 border-neutral-200 text-xs">Dismiss</Button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <div className="glass rounded-2xl p-8 text-center text-neutral-500">No reports</div>}
      </div>
    </div>
  );
};

// ====================================================================
// 6. ANALYTICS
// ====================================================================
const AnalyticsPanel = () => {
  const [data, setData] = useState(null);
  useEffect(() => { api('/admin/analytics').then(setData).catch(() => {}); }, []);
  if (!data) return <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)}</div>;
  const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#65a30d'];
  return (
    <div className="space-y-5">
      <Header title="Analytics" subtitle="Deep insights into platform performance" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Profile completion rate" value={`${data.profileCompletionRate}%`} icon={Activity} color="from-neutral-100 to-neutral-100" />
        <StatCard label="Team formation rate" value={`${data.teamFormationRate}%`} icon={TrendingUp} color="from-neutral-100 to-neutral-100" />
        <StatCard label="Colleges represented" value={data.collegesRepresented} icon={Calendar} color="from-neutral-100 to-neutral-100" />
        <StatCard label="Total messages" value={data.totalMessages} icon={Trophy} color="from-neutral-100 to-neutral-100" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4">DAU & Messages (14d)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.dau}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="day" stroke="rgba(0,0,0,0.35)" fontSize={10} />
              <YAxis stroke="rgba(0,0,0,0.35)" fontSize={10} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(0,0,0,0.08)', color: '#171717', borderRadius: 8 }} />
              <Line type="monotone" dataKey="dau" stroke="#4f46e5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="messages" stroke="#0891b2" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4">Top Technologies</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.technologies.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="name" stroke="rgba(0,0,0,0.35)" fontSize={9} />
              <YAxis stroke="rgba(0,0,0,0.35)" fontSize={10} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(0,0,0,0.08)', color: '#171717', borderRadius: 8 }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>{data.technologies.slice(0, 8).map((d, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4">College Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.colleges} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#4f46e5">
                {data.colleges.map((d, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(0,0,0,0.08)', color: '#171717', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4">Conversion Funnel</h3>
          <div className="space-y-2">
            {data.funnel.map((f, i) => {
              const max = data.funnel[0].count || 1;
              const pct = (f.count / max) * 100;
              return (
                <div key={f.stage}>
                  <div className="flex justify-between text-xs mb-1"><span>{f.stage}</span><span className="text-neutral-500">{f.count.toLocaleString()}</span></div>
                  <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.1, duration: 0.6 }}
                      className="h-full bg-indigo-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// 7. VERIFICATION
// ====================================================================
const VerificationPanel = () => {
  const [list, setList] = useState([]);
  useEffect(() => { api('/admin/verifications').then((d) => setList(d.verifications)).catch(() => {}); }, []);
  const decide = async (id, verified) => {
    try { await api(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ verified }) }); toast.success(verified ? 'Approved' : 'Rejected'); setList((l) => l.filter((v) => v.id !== id)); }
    catch (e) { toast.error(e.message); }
  };
  const typeIcon = { github: Github, linkedin: Linkedin, college_email: Mail };
  return (
    <div className="space-y-5">
      <Header title="Verification Queue" subtitle={`${list.length} pending verifications`} />
      <div className="space-y-3">
        {list.map((v) => {
          const I = typeIcon[v.type] || ShieldCheck;
          return (
            <motion.div key={v.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 flex items-center gap-3">
              <Avatar className="w-12 h-12"><AvatarImage src={v.userAvatar} /><AvatarFallback>{v.userName?.[0]}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-semibold">{v.userName}</span><Badge className="bg-neutral-100 text-neutral-700 border-0 text-[10px]"><I className="w-2.5 h-2.5 mr-1" />{v.type.replace('_', ' ')}</Badge></div>
                <div className="text-xs text-neutral-500 truncate">{v.evidence}</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Credibility: <span className={v.credibilityScore > 70 ? 'text-green-600' : 'text-amber-700'}>{v.credibilityScore}/100</span></div>
              </div>
              <Button size="sm" onClick={() => decide(v.userId, true)} className="gradient-button text-white border-0">Approve</Button>
              <Button size="sm" onClick={() => decide(v.userId, false)} variant="outline" className="bg-neutral-100 border-neutral-200">Reject</Button>
            </motion.div>
          );
        })}
        {list.length === 0 && <div className="glass rounded-2xl p-8 text-center text-neutral-500">All caught up ✨</div>}
      </div>
    </div>
  );
};

// ====================================================================
// 8. NOTIFICATIONS
// ====================================================================
const NotificationsPanel = () => {
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' });
  const [sent, setSent] = useState([]);
  useEffect(() => { api('/admin/notifications').then((d) => setSent(d.notifications)).catch(() => {}); }, []);
  const send = async () => {
    if (!form.title || !form.body) return toast.error('Title and body required');
    try { await api('/admin/notifications', { method: 'POST', body: JSON.stringify(form) }); toast.success('Notification sent!'); setForm({ title: '', body: '', audience: 'all' }); api('/admin/notifications').then((d) => setSent(d.notifications)); }
    catch (e) { toast.error(e.message); }
  };
  return (
    <div className="space-y-5">
      <Header title="Notification Center" subtitle="Broadcast announcements to users" />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4">Compose announcement</h3>
          <div className="space-y-3">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-neutral-100 border-neutral-200" />
            <Textarea placeholder="Message body... (supports basic markdown)" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="bg-neutral-100 border-neutral-200" />
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="w-full bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-2 text-sm">
              <option value="all">Everyone</option><option value="verified">Verified only</option><option value="active">Active users (last 7d)</option><option value="new">New users (last 30d)</option>
            </select>
            <Button onClick={send} className="w-full gradient-button text-white border-0"><Send className="w-4 h-4 mr-1" /> Send broadcast</Button>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold mb-4">Recent broadcasts</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sent.length === 0 && <div className="text-neutral-400 text-sm">No notifications sent yet</div>}
            {sent.map((n) => (
              <div key={n.id} className="glass rounded-xl p-3">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold text-sm">{n.title}</span><Badge className="bg-neutral-100 text-neutral-700 border-0 text-[10px]">{n.audience}</Badge></div>
                <p className="text-xs text-neutral-500 line-clamp-2">{n.body}</p>
                <div className="text-[10px] text-neutral-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// 9. AI MATCHING
// ====================================================================
const MatchingPanel = () => {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { api('/admin/matching-config').then((d) => setCfg(d.config)).catch(() => {}); }, []);
  const save = async () => { try { await api('/admin/matching-config', { method: 'PUT', body: JSON.stringify(cfg) }); toast.success('Saved'); } catch (e) { toast.error(e.message); } };
  if (!cfg) return <Skeleton className="h-64" />;
  const total = cfg.skillOverlap + cfg.complementary + cfg.interests + cfg.availability + cfg.experience;
  const SLIDERS = [
    { k: 'complementary', l: 'Complementary skills', d: 'Reward team-mates who fill skill gaps', c: 'from-neutral-100 to-neutral-100' },
    { k: 'interests', l: 'Shared interests', d: 'Common passions and domains', c: 'from-neutral-100 to-neutral-100' },
    { k: 'skillOverlap', l: 'Skill overlap', d: 'Some shared skills help collaboration', c: 'from-neutral-100 to-neutral-100' },
    { k: 'availability', l: 'Availability overlap', d: 'When can they actually meet', c: 'from-neutral-100 to-neutral-100' },
    { k: 'experience', l: 'Experience balance', d: 'Closer experience levels mesh better', c: 'from-neutral-100 to-neutral-100' },
  ];
  return (
    <div className="space-y-5">
      <Header title="AI Matching Control" subtitle="Tune the weights of the matching algorithm in real-time" action={<Button onClick={save} className="gradient-button text-white border-0">Save weights</Button>} />
      <div className="glass-strong rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Weight tuning</h3>
          <div className="flex items-center gap-2"><span className="text-xs text-neutral-500">Total:</span><Badge className={total === 1 ? 'bg-green-500/20 text-green-600 border-0' : 'bg-amber-500/20 text-amber-700 border-0'}>{total.toFixed(2)}</Badge></div>
        </div>
        {SLIDERS.map((s) => (
          <div key={s.k}>
            <div className="flex items-center justify-between mb-1.5">
              <div><div className="font-semibold text-sm">{s.l}</div><div className="text-xs text-neutral-500">{s.d}</div></div>
              <span className="text-sm font-bold tabular-nums">{(cfg[s.k] * 100).toFixed(0)}%</span>
            </div>
            <Slider value={[cfg[s.k] * 100]} onValueChange={(v) => setCfg({ ...cfg, [s.k]: v[0] / 100 })} max={100} step={1} />
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <div><div className="font-semibold text-sm">Matching engine</div><div className="text-xs text-neutral-500">Toggle the entire algorithm on/off</div></div>
          <Switch checked={cfg.enabled !== false} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// 10. CMS
// ====================================================================
const CMSPanel = () => {
  const [c, setC] = useState(null);
  useEffect(() => { api('/admin/cms').then((d) => setC(d.cms)).catch(() => {}); }, []);
  const save = async () => { try { await api('/admin/cms', { method: 'PUT', body: JSON.stringify(c) }); toast.success('Saved — live on the landing page now'); } catch (e) { toast.error(e.message); } };
  if (!c) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-5">
      <Header title="Content Management" subtitle="Edit landing page hero content — changes go live immediately" action={<Button onClick={save} className="gradient-button text-white border-0">Save changes</Button>} />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="font-bold">Hero section</h3>
          <div><label className="text-xs text-neutral-500 mb-1 block">Headline — line 1</label><Input value={c.heroTitleLine1 || ''} onChange={(e) => setC({ ...c, heroTitleLine1: e.target.value })} className="bg-neutral-100 border-neutral-200" /></div>
          <div><label className="text-xs text-neutral-500 mb-1 block">Headline — line 2 (highlighted)</label><Input value={c.heroTitleLine2 || ''} onChange={(e) => setC({ ...c, heroTitleLine2: e.target.value })} className="bg-neutral-100 border-neutral-200" /></div>
          <div><label className="text-xs text-neutral-500 mb-1 block">Subtitle</label><Textarea rows={3} value={c.heroSubtitle || ''} onChange={(e) => setC({ ...c, heroSubtitle: e.target.value })} className="bg-neutral-100 border-neutral-200" /></div>
          <div><label className="text-xs text-neutral-500 mb-1 block">Primary CTA button text</label><Input value={c.heroCta || ''} onChange={(e) => setC({ ...c, heroCta: e.target.value })} placeholder="Primary CTA" className="bg-neutral-100 border-neutral-200" /></div>
        </div>
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="font-bold">Preview</h3>
          <div className="glass rounded-xl p-6 text-center space-y-2">
            <div className="text-2xl font-bold leading-tight">{c.heroTitleLine1}<br /><span className="gradient-text">{c.heroTitleLine2}</span></div>
            <p className="text-xs text-neutral-500">{c.heroSubtitle}</p>
            <div className="inline-block mt-2 px-4 py-1.5 rounded-lg gradient-button text-white text-xs">{c.heroCta}</div>
          </div>
          <div className="text-xs text-neutral-400 text-center">Full page: <a href="/" target="_blank" rel="noreferrer" className="text-neutral-700 underline">open landing page</a></div>
        </div>
      </div>
      <div className="text-xs text-neutral-400">Feature toggles (AI, Google OAuth, signups, maintenance mode) live under <span className="text-neutral-500">Settings</span>, not here — keeping one source of truth for operational flags.</div>
    </div>
  );
};

// ====================================================================
// 11. SECURITY
// ====================================================================
const SecurityPanel = () => {
  const [data, setData] = useState(null);
  useEffect(() => { api('/admin/security').then(setData).catch(() => {}); }, []);
  if (!data) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-5">
      <Header title="Security Center" subtitle="Monitor authentication, sessions, and threats" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Logins (24h)" value={data.summary.totalLogins24h} icon={Lock} color="from-neutral-100 to-neutral-100" />
        <StatCard label="Failed attempts" value={data.summary.failedAttempts} icon={ShieldAlert} color="from-neutral-100 to-neutral-100" />
        <StatCard label="Suspicious IPs" value={data.summary.suspiciousIps} icon={AlertTriangle} color="from-neutral-100 to-neutral-100" />
        <StatCard label="Active sessions" value={data.summary.activeSessions} icon={Activity} color="from-neutral-100 to-neutral-100" />
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-neutral-100"><h3 className="font-bold">Recent login activity</h3></div>
        {data.events.length === 0 ? (
          <div className="p-10 text-center text-neutral-400 text-sm">
            Login/session event logging isn't implemented yet, so there's nothing to show here.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {data.events.slice(0, 12).map((e) => (
              <div key={e.id} className="p-3 flex items-center gap-3">
                <Avatar className="w-8 h-8"><AvatarImage src={e.userAvatar} /><AvatarFallback>{e.userName?.[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{e.userName}</span>
                    <Badge className={`text-[10px] border-0 ${e.type === 'failed_login' ? 'bg-red-500/20 text-red-600' : e.type === 'suspicious' ? 'bg-amber-500/20 text-amber-700' : 'bg-green-500/20 text-green-600'}`}>{e.type.replace('_', ' ')}</Badge>
                    <span className="text-xs text-neutral-400">{e.location} · {e.ip}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${e.riskScore > 70 ? 'text-red-600' : e.riskScore > 40 ? 'text-amber-700' : 'text-green-600'}`}>Risk: {e.riskScore}</span>
                  <span className="text-[10px] text-neutral-400">{new Date(e.at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ====================================================================
// 12. RBAC
// ====================================================================
const RBACPanel = () => {
  const [roles, setRoles] = useState(null);
  const [perms, setPerms] = useState([]);
  const [dirty, setDirty] = useState(false);
  const load = () => { api('/admin/roles').then((d) => { setRoles(d.roles); setPerms(d.permissions); setDirty(false); }).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const toggle = (roleIdx, perm) => {
    setRoles((rs) => rs.map((r, i) => {
      if (i !== roleIdx) return r;
      const has = r.permissions.includes(perm);
      return { ...r, permissions: has ? r.permissions.filter((p) => p !== perm) : [...r.permissions, perm] };
    }));
    setDirty(true);
  };
  const addRole = () => {
    const name = prompt('New role name:');
    if (!name) return;
    setRoles((rs) => [...rs, { name, permissions: [] }]);
    setDirty(true);
  };
  const removeRole = (idx) => {
    if (!confirm('Delete this role?')) return;
    setRoles((rs) => rs.filter((_, i) => i !== idx));
    setDirty(true);
  };
  const save = async () => {
    try { await api('/admin/roles', { method: 'PUT', body: JSON.stringify({ roles }) }); toast.success('Saved'); setDirty(false); }
    catch (e) { toast.error(e.message); }
  };

  if (!roles) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-5">
      <Header title="Roles & Permissions" subtitle="Define role/permission sets. Click a cell to toggle." action={
        <div className="flex gap-2">
          <Button onClick={addRole} variant="outline" className="bg-neutral-100 border-neutral-200"><Plus className="w-4 h-4 mr-1" /> New role</Button>
          <Button onClick={save} disabled={!dirty} className="gradient-button text-white border-0 disabled:opacity-40">Save changes</Button>
        </div>
      } />
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-white/[0.02]">
              <tr><th className="p-3 text-left text-xs text-neutral-500 uppercase">Permission</th>
              {roles.map((r, i) => (
                <th key={r.name + i} className="p-3 text-center text-xs text-neutral-500 uppercase">
                  <div className="flex items-center justify-center gap-1">{r.name}
                    <button onClick={() => removeRole(i)} className="text-neutral-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                  </div>
                </th>
              ))}</tr>
            </thead>
            <tbody>
              {perms.map((p) => (
                <tr key={p} className="border-b border-neutral-100 hover:bg-white/[0.02]">
                  <td className="p-3 text-neutral-700">{p}</td>
                  {roles.map((r, i) => (
                    <td key={r.name + i} className="p-3 text-center cursor-pointer" onClick={() => toggle(i, p)}>
                      {r.permissions.includes(p) ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-neutral-300 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-xs text-neutral-400">These are permission definitions only — every admin account currently has full access regardless of role. Enforcing per-role restrictions on each endpoint is a larger change not yet wired up.</div>
    </div>
  );
};

// ====================================================================
// 13. SETTINGS
// ====================================================================
const SettingsPanel = () => {
  const [s, setS] = useState(null);
  useEffect(() => { api('/admin/settings').then((d) => setS(d.settings)).catch(() => {}); }, []);
  const save = async () => { try { await api('/admin/settings', { method: 'PUT', body: JSON.stringify(s) }); toast.success('Saved'); } catch (e) { toast.error(e.message); } };
  if (!s) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-5">
      <Header title="Platform Settings" subtitle="Branding, feature toggles, and operational controls" action={<Button onClick={save} className="gradient-button text-white border-0">Save all</Button>} />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="font-bold">Branding</h3>
          <div><label className="text-xs text-neutral-500 mb-1 block">Brand name</label><Input value={s.brandName || ''} onChange={(e) => setS({ ...s, brandName: e.target.value })} className="bg-neutral-100 border-neutral-200" /></div>
          <div><label className="text-xs text-neutral-500 mb-1 block">Primary color</label><div className="flex gap-2"><Input value={s.primaryColor || '#4f46e5'} onChange={(e) => setS({ ...s, primaryColor: e.target.value })} className="bg-neutral-100 border-neutral-200" /><div className="w-10 h-10 rounded-lg" style={{ background: s.primaryColor }} /></div></div>
        </div>
        <div className="glass rounded-2xl p-5 space-y-2">
          <h3 className="font-bold mb-2">Operations</h3>
          {[
            { k: 'maintenance', l: 'Maintenance mode', d: 'Show maintenance banner to users' },
            { k: 'signupsOpen', l: 'Signups open', d: 'Allow new account creation' },
            { k: 'googleOAuth', l: 'Google OAuth', d: 'Enable "Continue with Google"' },
            { k: 'aiEnabled', l: 'AI features', d: 'Project ideas, role suggestions, balance' },
          ].map((t) => (
            <div key={t.k} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-100">
              <div><div className="text-sm font-semibold">{t.l}</div><div className="text-[10px] text-neutral-500">{t.d}</div></div>
              <Switch checked={!!s[t.k]} onCheckedChange={(v) => setS({ ...s, [t.k]: v })} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
