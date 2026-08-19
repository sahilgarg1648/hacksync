'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';
import {
  Sparkles, Users, Github, Linkedin, MessageSquare, Brain, Trophy,
  Code2, Rocket, ChevronRight, ArrowRight, Bell, LogOut,
  Calendar, Clock, Award,
  Plus, X, Check, Layers, Heart, Send, Smile, MoreVertical,
  Server, Lightbulb, Flame, GitFork, Star, Zap, UserPlus, Loader2,
  GraduationCap, Shield, ShieldCheck,
} from 'lucide-react';

// ---------- constants ----------
const SKILLS = ['React', 'Node.js', 'MongoDB', 'Python', 'AI/ML', 'UI/UX', 'Blockchain', 'DevOps', 'App Development', 'TypeScript', 'Go', 'Rust', 'Solidity', 'Figma', 'PostgreSQL', 'GraphQL', 'AWS', 'Docker'];
const INTERESTS = ['AI', 'Healthcare', 'FinTech', 'Cybersecurity', 'EdTech', 'Sustainability', 'Web3', 'Gaming', 'Productivity'];
const AVAILABILITY = ['Weekdays', 'Weekends', 'Mornings', 'Evenings', 'Nights'];
const EXPERIENCE = [
  { v: 'beginner', l: 'Beginner', d: '< 1 year' },
  { v: 'intermediate', l: 'Intermediate', d: '1-3 years' },
  { v: 'advanced', l: 'Advanced', d: '3-5 years' },
  { v: 'expert', l: 'Expert', d: '5+ years' },
];
const ROLES = ['Frontend Engineer', 'Backend Engineer', 'Full-Stack Engineer', 'AI/ML Engineer', 'Mobile Developer', 'UI/UX Designer', 'Blockchain Developer', 'DevOps', 'Product Manager'];
const CHART_COLORS = ['#a855f7', '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#10b981'];

// ---------- API helper ----------
const api = async (path, opts = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
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

// ---------- floating orbs background ----------
const Orbs = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/30 blur-[120px] animate-pulse-glow" />
    <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/25 blur-[120px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
    <div className="absolute bottom-[10%] left-[20%] w-[450px] h-[450px] rounded-full bg-cyan-500/20 blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
    <div className="absolute inset-0 grid-pattern opacity-40" />
  </div>
);

// ---------- circular match ring ----------
const MatchRing = ({ score, size = 80, stroke = 6 }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const glow = score >= 80 ? 'rgba(168,85,247,0.6)' : score >= 60 ? 'rgba(59,130,246,0.6)' : 'rgba(6,182,212,0.5)';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`grad-${score}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={`url(#grad-${score}-${size})`}
          strokeWidth={stroke} strokeLinecap="round" fill="none"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-2xl font-bold gradient-text">{score}</span>
        <span className="text-[9px] text-white/50 uppercase tracking-wider">match</span>
      </div>
    </div>
  );
};

const Counter = ({ to }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const dur = 1500; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      setN(Math.floor((to) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to]);
  return <span ref={ref}>{n.toLocaleString()}</span>;
};

// ====================================================================
// ROOT APP
// ====================================================================
export default function App() {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({ developers: 0, hackathons: 0, teams: 0 });
  const [hackathons, setHackathons] = useState([]);
  const [topDevelopers, setTopDevelopers] = useState([]);
  const [cms, setCms] = useState(null);
  const [selectedDev, setSelectedDev] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [submitHackathonOpen, setSubmitHackathonOpen] = useState(false);
  const [selectedDMUser, setSelectedDMUser] = useState(null);

  const openConversationWith = (dev) => {
    if (!user) { setSelectedDev(null); setAuthTab('login'); setAuthOpen(true); return; }
    setSelectedDev(null);
    setSelectedDMUser({ id: dev.id, name: dev.name, avatar: dev.avatar });
    setView('dm');
  };

  useEffect(() => {
    api('/stats').then(setStats).catch(() => {});
    api('/developers').then((d) => setTopDevelopers(d.developers.slice(0, 6))).catch(() => {});
    api('/hackathons').then((d) => setHackathons(d.hackathons)).catch(() => {});
    api('/cms').then((d) => setCms(d.cms)).catch(() => {});
  }, []);

  // handle Google OAuth callback (?token=...) and ?google_error=
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      localStorage.setItem('token', t);
      window.history.replaceState({}, '', window.location.pathname);
      toast.success('Signed in with Google!');
    }
    const ge = params.get('google_error');
    if (ge) {
      toast.error(`Google sign-in failed: ${ge}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) return;
    api('/auth/me')
      .then((d) => {
        setUser(d.user);
        if (!d.user.profileComplete) setOnboardingOpen(true);
        else setView('dashboard');
      })
      .catch(() => localStorage.removeItem('token'));
  }, []);

  // land directly on a team after creating one from the hackathon detail page (?team=<id>)
  useEffect(() => {
    if (typeof window === 'undefined' || !user?.profileComplete) return;
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('team');
    if (teamId) {
      setSelectedTeamId(teamId);
      setView('team');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  useEffect(() => {
    if (user?.profileComplete && view === 'dashboard') {
      setLoadingMatches(true);
      api('/matches').then((d) => setMatches(d.matches)).catch((e) => toast.error(e.message)).finally(() => setLoadingMatches(false));
    }
    if (user?.profileComplete && view === 'teams') {
      api('/teams').then((d) => setTeams(d.teams)).catch(() => {});
    }
  }, [user, view]);

  const onAuthSuccess = (data) => {
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setAuthOpen(false);
    if (!data.user.profileComplete) setOnboardingOpen(true);
    else setView('dashboard');
    toast.success(`Welcome, ${data.user.name}!`);
  };

  const onProfileSave = (u) => {
    setUser(u); setOnboardingOpen(false); setView('dashboard');
    toast.success('Profile complete! Finding your matches...');
  };

  const logout = () => {
    localStorage.removeItem('token'); setUser(null); setView('landing'); setMatches([]); setTeams([]);
    toast.success('Signed out');
  };

  const refreshTeams = () => api('/teams').then((d) => setTeams(d.teams)).catch(() => {});

  return (
    <div className="min-h-screen relative">
      <Orbs />

      {view === 'landing' && (
        <Landing
          stats={stats} hackathons={hackathons} topDevelopers={topDevelopers} cms={cms}
          onSignIn={() => { setAuthTab('login'); setAuthOpen(true); }}
          onSignUp={() => { setAuthTab('register'); setAuthOpen(true); }}
          onViewDev={setSelectedDev}
        />
      )}

      {(view === 'dashboard' || view === 'matches' || view === 'profile' || view === 'teams' || view === 'team' || view === 'messages' || view === 'dm') && user && (
        <AppShell user={user} view={view} setView={(v) => { setView(v); if (v !== 'team') setSelectedTeamId(null); if (v !== 'dm') setSelectedDMUser(null); }} onLogout={logout}>
          {view === 'dashboard' && (
            <Dashboard user={user} matches={matches} hackathons={hackathons}
              onSubmitHackathon={() => setSubmitHackathonOpen(true)} />
          )}
          {view === 'matches' && (
            <MatchesView user={user} onViewDev={setSelectedDev} onMessage={openConversationWith}
              onOpenTeam={(id) => { setSelectedTeamId(id); setView('team'); }} />
          )}
          {view === 'profile' && (
            <ProfileView user={user} onEdit={() => setOnboardingOpen(true)}
              onOpenTeam={(id) => { setSelectedTeamId(id); setView('team'); }} />
          )}
          {view === 'teams' && (
            <TeamsView teams={teams} user={user} hackathons={hackathons}
              onCreate={() => setCreateTeamOpen(true)}
              onOpen={(id) => { setSelectedTeamId(id); setView('team'); }}
              onRefresh={refreshTeams}
            />
          )}
          {view === 'team' && selectedTeamId && (
            <TeamDetail teamId={selectedTeamId} user={user} onBack={() => setView('teams')} />
          )}
          {view === 'messages' && (
            <MessagesView onOpen={(otherUser) => { setSelectedDMUser(otherUser); setView('dm'); }} />
          )}
          {view === 'dm' && selectedDMUser && (
            <DMThread user={user} otherUser={selectedDMUser} onBack={() => setView('messages')} />
          )}
        </AppShell>
      )}

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-md glass-strong border-white/10 p-0 overflow-hidden">
          <AuthForm tab={authTab} setTab={setAuthTab} onSuccess={onAuthSuccess} />
        </DialogContent>
      </Dialog>

      <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <DialogContent className="sm:max-w-3xl glass-strong border-white/10 max-h-[90vh] overflow-y-auto">
          <Onboarding user={user} onSave={onProfileSave} onClose={() => setOnboardingOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDev} onOpenChange={(o) => !o && setSelectedDev(null)}>
        <DialogContent className="sm:max-w-2xl glass-strong border-white/10 max-h-[90vh] overflow-y-auto">
          {selectedDev && <DeveloperDetail dev={selectedDev} onConnect={() => openConversationWith(selectedDev)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent className="sm:max-w-lg glass-strong border-white/10">
          <CreateTeamForm onCreated={(t) => { setCreateTeamOpen(false); refreshTeams(); setSelectedTeamId(t.id || t._id); setView('team'); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={submitHackathonOpen} onOpenChange={setSubmitHackathonOpen}>
        <DialogContent className="sm:max-w-lg glass-strong border-white/10">
          <SubmitHackathonForm onSubmitted={() => setSubmitHackathonOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====================================================================
// LANDING
// ====================================================================
const Landing = ({ stats, hackathons, topDevelopers, cms, onSignIn, onSignUp, onViewDev }) => {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -100]);
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between glass rounded-2xl px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center glow-purple">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">HackSync</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#developers" className="hover:text-white transition">Developers</a>
            <a href="/hackathons" className="hover:text-white transition">Hackathons</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onSignIn} className="text-white/80 hover:text-white hover:bg-white/5">Sign in</Button>
            <Button onClick={onSignUp} className="gradient-button text-white border-0 rounded-xl">
              Get Started <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-40 pb-32 px-6">
        <motion.div style={{ y: heroY }} className="max-w-6xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/80">AI-powered teammate matching</span>
            <Badge className="bg-purple-500/20 text-purple-300 border-0 text-[10px]">NEW</Badge>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.05] mb-6">
            {cms?.heroTitleLine1 ?? 'Find your perfect'}<br /><span className="gradient-text">{cms?.heroTitleLine2 ?? 'hackathon team'}</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
            {cms?.heroSubtitle ?? 'Stop hunting for teammates in chaotic Discord servers. HackSync uses an intelligent matching engine to pair you with developers whose skills, interests, and availability complete your stack.'}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={onSignUp} size="lg" className="gradient-button text-white border-0 rounded-xl px-8 h-12 text-base">
              <Rocket className="w-4 h-4 mr-2" /> {cms?.heroCta ?? 'Start matching free'}
            </Button>
            <Button onClick={onSignIn} size="lg" variant="outline" className="rounded-xl bg-white/5 border-white/10 hover:bg-white/10 h-12 px-8 text-base">
              Browse developers <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="mt-20 relative max-w-4xl mx-auto">
            <FloatingMatchPreview />
          </motion.div>
        </motion.div>

        <div className="max-w-3xl mx-auto mt-24 grid grid-cols-3 gap-4">
          {[
            { label: 'Developers', value: stats.developers, icon: Users, color: 'from-purple-500 to-pink-500' },
            { label: 'Hackathons', value: stats.hackathons, icon: Trophy, color: 'from-amber-500 to-orange-500' },
            { label: 'Teams Built', value: stats.teams, icon: Layers, color: 'from-green-500 to-emerald-500' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass rounded-2xl p-5">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-3xl font-bold"><Counter to={s.value} />+</div>
              <div className="text-xs text-white/50 uppercase tracking-wider mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeader badge="Features" title="Built for the way developers actually team up" subtitle="Every feature designed to remove friction between you and your dream team." />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: 'Smart matching engine', desc: 'Weighted compatibility on skills, interests, availability, and complementary expertise.', color: 'from-purple-500 to-pink-500' },
              { icon: Sparkles, title: 'AI team strategist', desc: 'Gemini generates project ideas, role assignments, and team balance analysis.', color: 'from-blue-500 to-cyan-500' },
              { icon: MessageSquare, title: 'Real-time team chat', desc: 'Discord-style team rooms with typing indicators, presence, and instant messaging.', color: 'from-cyan-500 to-teal-500' },
              { icon: Github, title: 'GitHub verified skills', desc: 'Connect GitHub and we analyze your repos to verify languages with skill confidence charts.', color: 'from-amber-500 to-orange-500' },
              { icon: Trophy, title: 'Hackathon discovery', desc: 'Browse trending hackathons with prize pools, deadlines, and one-click team registration.', color: 'from-rose-500 to-red-500' },
              { icon: UserPlus, title: 'Role-based teams', desc: 'Define what your team needs. Let candidates apply. Approve with a single click.', color: 'from-green-500 to-emerald-500' },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }}
                className="glass rounded-2xl p-6 group cursor-pointer relative overflow-hidden">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-white/60">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="developers" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeader badge="Talent" title="Top developers on HackSync" subtitle="Real builders looking for their next project. These could be your teammates." />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topDevelopers.map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4, scale: 1.01 }} onClick={() => onViewDev(d)}
                className="glass rounded-2xl p-5 cursor-pointer relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className="relative">
                    <Avatar className="w-12 h-12 ring-2 ring-purple-500/30"><AvatarImage src={d.avatar} /><AvatarFallback>{d.name?.[0]}</AvatarFallback></Avatar>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full ring-2 ring-[#0a0816]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{d.name}</div>
                    <div className="text-xs text-white/50">{d.college} · {d.year}</div>
                  </div>
                </div>
                <p className="text-xs text-white/60 line-clamp-2 mb-4">{d.bio}</p>
                <div className="flex flex-wrap gap-1">
                  {d.skills.slice(0, 4).map((s) => <Badge key={s} variant="secondary" className="bg-white/5 text-white/70 border-0 text-[10px]">{s}</Badge>)}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button onClick={onSignUp} size="lg" className="gradient-button text-white border-0 rounded-xl">Join to see all <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      </section>

      <section id="hackathons" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeader badge="Trending" title="Hackathons happening now" subtitle="Pick an event. Find a team. Build something legendary." />
          <div className="grid md:grid-cols-2 gap-5">
            {hackathons.slice(0, 4).map((h, i) => (
              <HackathonCard key={h.id} h={h} delay={i * 0.1} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild size="lg" variant="outline" className="rounded-xl bg-white/5 border-white/10 hover:bg-white/10 h-12 px-8 text-base">
              <a href="/hackathons">View all hackathons <ChevronRight className="w-4 h-4 ml-1" /></a>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="relative glass-strong rounded-3xl p-12 md:p-16 text-center overflow-hidden gradient-border">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-cyan-500/10" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 mb-6"><Flame className="w-5 h-5 text-orange-400" /><span className="text-sm text-white/70">Limited spots — early access</span></div>
              <h2 className="text-4xl md:text-6xl font-bold mb-5 leading-tight">Your dream team is<br /><span className="gradient-text">one match away.</span></h2>
              <p className="text-white/60 mb-8 max-w-xl mx-auto">Join hundreds of student developers who already found their hackathon partners on HackSync.</p>
              <Button onClick={onSignUp} size="lg" className="gradient-button text-white border-0 rounded-xl h-12 px-8 text-base">
                Create your profile <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" /><span>HackSync · Built for builders</span></div>
          <div>© 2025 HackSync</div>
        </div>
      </footer>
    </>
  );
};

const SectionHeader = ({ badge, title, subtitle }) => (
  <div className="text-center mb-14">
    <Badge className="mb-4 bg-white/5 text-white/70 border-white/10 backdrop-blur">{badge}</Badge>
    <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">{title}</h2>
    <p className="text-white/60 max-w-2xl mx-auto">{subtitle}</p>
  </div>
);

const HackathonCard = ({ h, delay = 0 }) => (
  <motion.a href={`/hackathons/${h.id}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }}
    whileHover={{ y: -4 }} className="glass rounded-2xl overflow-hidden group block cursor-pointer">
    <div className="relative h-44 overflow-hidden">
      {h.banner ? (
        <img src={h.banner} alt={h.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-600/40 via-blue-600/30 to-cyan-500/30 flex items-center justify-center"><Trophy className="w-10 h-10 text-white/30" /></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07060d] via-[#07060d]/40 to-transparent" />
      <Badge className="absolute top-3 right-3 bg-purple-500/90 text-white border-0">{h.tag}</Badge>
      {h.college && (
        <Badge className="absolute top-3 left-3 border-0 bg-cyan-500/90 text-white flex items-center gap-1">
          <GraduationCap className="w-3 h-3" /> {h.college}
        </Badge>
      )}
    </div>
    <div className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg">{h.name}</h3>
          <p className="text-xs text-white/50 mt-1">{h.domain}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/40">Prize pool</div>
          <div className="font-bold gradient-text text-lg">{h.prize}</div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-white/50">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {h.deadline}</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {h.participants}</span>
      </div>
    </div>
  </motion.a>
);

const FloatingMatchPreview = () => (
  <div className="relative">
    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className="glass-strong rounded-3xl p-8 max-w-md mx-auto gradient-border relative">
      <div className="flex items-center gap-4">
        <MatchRing score={94} size={88} />
        <div className="text-left flex-1">
          <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Top match</div>
          <div className="font-bold text-lg">Priya Iyer</div>
          <div className="text-xs text-white/60">BITS Pilani · AI/ML Researcher</div>
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge className="bg-purple-500/20 text-purple-300 border-0 text-[10px]">+ AI/ML</Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-0 text-[10px]">+ PyTorch</Badge>
            <Badge className="bg-cyan-500/20 text-cyan-300 border-0 text-[10px]">~ Healthcare</Badge>
          </div>
        </div>
      </div>
    </motion.div>
    <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      className="absolute -top-6 -right-4 md:right-12 glass rounded-2xl p-3 hidden md:flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-xs">3 new matches</span>
    </motion.div>
    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      className="absolute -bottom-4 -left-4 md:left-12 glass rounded-2xl p-3 hidden md:flex items-center gap-2">
      <Trophy className="w-4 h-4 text-amber-400" /><span className="text-xs">AI Builders Summit</span>
    </motion.div>
  </div>
);

// ====================================================================
// AUTH FORM (with Google OAuth)
// ====================================================================
const AuthForm = ({ tab, setTab, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const submit = async (kind) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await api(`/auth/${kind}`, { method: 'POST', body: JSON.stringify(form) });
      onSuccess(data);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };
  const googleSignIn = async () => {
    try {
      const { url } = await api('/auth/google');
      window.location.href = url;
    } catch (e) { toast.error('Google sign-in unavailable'); }
  };
  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center glow-purple">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-lg">Welcome to HackSync</h2>
          <p className="text-xs text-white/50">Find your perfect hackathon team</p>
        </div>
      </div>

      <Button onClick={googleSignIn} variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10 h-11 mb-4">
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1h-9.17v2.92h5.27c-.23 1.39-1.62 4.07-5.27 4.07-3.17 0-5.76-2.62-5.76-5.85 0-3.23 2.59-5.85 5.76-5.85 1.81 0 3.02.77 3.71 1.43l2.53-2.43C16.94 3.92 14.78 3 12.18 3 6.99 3 2.78 7.21 2.78 12.4s4.21 9.4 9.4 9.4c5.43 0 9.02-3.81 9.02-9.18 0-.62-.07-1.09-.15-1.52z"/></svg>
        Continue with Google
      </Button>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-white/10" /><span className="text-xs text-white/40">or</span><div className="h-px flex-1 bg-white/10" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 bg-white/5 mb-6">
          <TabsTrigger value="login">Sign in</TabsTrigger>
          <TabsTrigger value="register">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value="login" className="space-y-3">
          <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white/5 border-white/10 h-11" />
          <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-white/5 border-white/10 h-11" />
          <Button onClick={() => submit('login')} disabled={loading} className="w-full gradient-button text-white border-0 h-11">
            {loading ? 'Signing in...' : 'Sign in'} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </TabsContent>
        <TabsContent value="register" className="space-y-3">
          <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/5 border-white/10 h-11" />
          <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white/5 border-white/10 h-11" />
          <Input placeholder="Password (min 6 chars)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-white/5 border-white/10 h-11" />
          <Button onClick={() => submit('register')} disabled={loading} className="w-full gradient-button text-white border-0 h-11">
            {loading ? 'Creating...' : 'Create account'} <Rocket className="w-4 h-4 ml-1" />
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ====================================================================
// ONBOARDING
// ====================================================================
const Onboarding = ({ user, onSave, onClose }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    college: user?.college || '', year: user?.year || '', bio: user?.bio || '', avatar: user?.avatar || '',
    skills: user?.skills || [], interests: user?.interests || [],
    github: user?.github || '', linkedin: user?.linkedin || '',
    availability: user?.availability || [], experience: user?.experience || 'beginner',
  });
  const [saving, setSaving] = useState(false);
  const [customSkill, setCustomSkill] = useState('');
  const [customInterest, setCustomInterest] = useState('');
  const toggleArr = (k, v) => setData((d) => ({ ...d, [k]: d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v] }));
  const addCustom = (k, value, reset) => {
    const v = value.trim().slice(0, 30);
    if (!v) return;
    setData((d) => {
      if (d[k].some((x) => x.toLowerCase() === v.toLowerCase())) return d;
      if (d[k].length >= 20) { toast.error('Max 20 — remove one first'); return d; }
      return { ...d, [k]: [...d[k], v] };
    });
    reset('');
  };
  const save = async () => {
    setSaving(true);
    try { const res = await api('/profile', { method: 'PUT', body: JSON.stringify(data) }); onSave(res.user); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };
  const steps = ['Basics', 'Skills', 'Interests', 'Availability'];
  const canProceed = [data.college && data.bio, data.skills.length >= 2, data.interests.length >= 1, data.availability.length >= 1];
  return (
    <div className="p-2">
      <div className="mb-6">
        <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Step {step + 1} of {steps.length}</div>
        <h2 className="text-3xl font-bold tracking-tight">{steps[step]}</h2>
        <div className="flex gap-2 mt-4">
          {steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-gradient-to-r from-purple-500 to-cyan-400' : 'bg-white/10'}`} />)}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
          {step === 0 && (
            <>
              <div className="grid md:grid-cols-2 gap-3">
                <div><label className="text-xs text-white/60 mb-1 block">College / University</label>
                  <Input value={data.college} onChange={(e) => setData({ ...data, college: e.target.value })} className="bg-white/5 border-white/10" placeholder="IIT Bombay" /></div>
                <div><label className="text-xs text-white/60 mb-1 block">Year</label>
                  <Input value={data.year} onChange={(e) => setData({ ...data, year: e.target.value })} className="bg-white/5 border-white/10" placeholder="3rd Year" /></div>
              </div>
              <div><label className="text-xs text-white/60 mb-1 block">Avatar URL (optional)</label>
                <Input value={data.avatar} onChange={(e) => setData({ ...data, avatar: e.target.value })} className="bg-white/5 border-white/10" placeholder="https://..." /></div>
              <div><label className="text-xs text-white/60 mb-1 block">Bio</label>
                <Textarea value={data.bio} onChange={(e) => setData({ ...data, bio: e.target.value })} rows={3} className="bg-white/5 border-white/10" placeholder="What do you build, what do you love..." /></div>
              <div className="grid md:grid-cols-2 gap-3">
                <Input value={data.github} onChange={(e) => setData({ ...data, github: e.target.value })} className="bg-white/5 border-white/10" placeholder="GitHub username or URL" />
                <Input value={data.linkedin} onChange={(e) => setData({ ...data, linkedin: e.target.value })} className="bg-white/5 border-white/10" placeholder="LinkedIn URL" />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-2 block">Experience</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {EXPERIENCE.map((e) => (
                    <button key={e.v} onClick={() => setData({ ...data, experience: e.v })}
                      className={`p-3 rounded-lg border text-left transition ${data.experience === e.v ? 'bg-purple-500/20 border-purple-400 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}>
                      <div className="font-semibold text-sm">{e.l}</div><div className="text-[10px] text-white/50">{e.d}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {step === 1 && (
            <div>
              <p className="text-sm text-white/60 mb-4">Pick your strongest skills (min 2). These power the matching engine.</p>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((s) => (
                  <button key={s} onClick={() => toggleArr('skills', s)}
                    className={`px-4 py-2 rounded-full border text-sm transition ${data.skills.includes(s) ? 'bg-gradient-to-r from-purple-500 to-blue-500 border-transparent text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}>
                    {s} {data.skills.includes(s) && <Check className="w-3 h-3 inline ml-1" />}
                  </button>
                ))}
                {data.skills.filter((s) => !SKILLS.includes(s)).map((s) => (
                  <button key={s} onClick={() => toggleArr('skills', s)}
                    className="px-4 py-2 rounded-full border border-transparent text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center gap-1">
                    {s} <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Input value={customSkill} onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom('skills', customSkill, setCustomSkill); } }}
                  maxLength={30} placeholder="Not listed? Add your own skill..." className="bg-white/5 border-white/10 flex-1" />
                <Button type="button" variant="outline" onClick={() => addCustom('skills', customSkill, setCustomSkill)} className="bg-white/5 border-white/10 flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <p className="text-sm text-white/60 mb-4">What domains excite you? (min 1)</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((s) => (
                  <button key={s} onClick={() => toggleArr('interests', s)}
                    className={`px-4 py-2 rounded-full border text-sm transition ${data.interests.includes(s) ? 'bg-gradient-to-r from-blue-500 to-cyan-400 border-transparent text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}>
                    {s} {data.interests.includes(s) && <Check className="w-3 h-3 inline ml-1" />}
                  </button>
                ))}
                {data.interests.filter((s) => !INTERESTS.includes(s)).map((s) => (
                  <button key={s} onClick={() => toggleArr('interests', s)}
                    className="px-4 py-2 rounded-full border border-transparent text-sm bg-gradient-to-r from-blue-500 to-cyan-400 text-white flex items-center gap-1">
                    {s} <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Input value={customInterest} onChange={(e) => setCustomInterest(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom('interests', customInterest, setCustomInterest); } }}
                  maxLength={30} placeholder="Not listed? Add your own interest..." className="bg-white/5 border-white/10 flex-1" />
                <Button type="button" variant="outline" onClick={() => addCustom('interests', customInterest, setCustomInterest)} className="bg-white/5 border-white/10 flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <p className="text-sm text-white/60 mb-4">When are you typically available? (min 1)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABILITY.map((s) => (
                  <button key={s} onClick={() => toggleArr('availability', s)}
                    className={`p-4 rounded-xl border text-left transition ${data.availability.includes(s) ? 'bg-purple-500/20 border-purple-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    <Clock className="w-5 h-5 mb-2 text-purple-300" /><div className="font-semibold text-sm">{s}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
        <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : onClose()} className="text-white/60">{step === 0 ? 'Cancel' : 'Back'}</Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed[step]} className="gradient-button text-white border-0">Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
        ) : (
          <Button onClick={save} disabled={!canProceed[step] || saving} className="gradient-button text-white border-0">{saving ? 'Saving...' : 'Find my team'} <Sparkles className="w-4 h-4 ml-1" /></Button>
        )}
      </div>
    </div>
  );
};

// ====================================================================
// APP SHELL
// ====================================================================
const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const NotificationInbox = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const load = () => { api('/notifications').then((d) => { setNotifications(d.notifications); setUnreadCount(d.unreadCount); }).catch(() => {}); };
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);

  const onOpenChange = (o) => {
    setOpen(o);
    if (o && unreadCount > 0) {
      api('/notifications/read-all', { method: 'POST' }).then(() => {
        setUnreadCount(0);
        setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
      }).catch(() => {});
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="text-white/60 hover:text-white relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-purple-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 glass-strong border-white/10 p-0 overflow-hidden">
        <div className="p-3 border-b border-white/5 font-semibold text-sm">Notifications</div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">You're all caught up.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((n) => (
                <div key={n.id} className={`p-3 ${n.read ? '' : 'bg-purple-500/[0.06]'}`}>
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{n.title}</div>
                      <p className="text-xs text-white/60 mt-0.5">{n.body}</p>
                      <div className="text-[10px] text-white/40 mt-1">{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const MessagesNavButton = ({ active, onClick }) => {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const load = () => { api('/conversations').then((d) => setUnread(d.totalUnread || 0)).catch(() => {}); };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <button onClick={onClick}
      className={`relative px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
      <MessageSquare className="w-3.5 h-3.5" /> Messages
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-purple-500 text-white text-[9px] font-bold flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
};

const AppShell = ({ user, view, setView, onLogout, children }) => (
  <>
    <nav className="fixed top-0 left-0 right-0 z-30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass rounded-2xl px-5 py-2.5">
        <div className="flex items-center gap-6">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
            <span className="font-bold tracking-tight">HackSync</span>
          </button>
          <div className="hidden md:flex items-center gap-1">
            {[
              { k: 'dashboard', l: 'Dashboard', i: Layers },
              { k: 'matches', l: 'Matches', i: Heart },
              { k: 'teams', l: 'Teams', i: Users },
            ].map((t) => (
              <button key={t.k} onClick={() => setView(t.k)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition ${view === t.k || (t.k === 'teams' && view === 'team') ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                <t.i className="w-3.5 h-3.5" /> {t.l}
              </button>
            ))}
            <a href="/hackathons" className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition text-white/60 hover:text-white hover:bg-white/5">
              <Trophy className="w-3.5 h-3.5" /> Hackathons
            </a>
            <MessagesNavButton active={view === 'messages' || view === 'dm'} onClick={() => setView('messages')} />
            <button onClick={() => setView('profile')}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition ${view === 'profile' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              <Award className="w-3.5 h-3.5" /> Profile
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user.isAdmin && (
            <a href="/admin" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition">
              <Shield className="w-3.5 h-3.5" /> Admin
            </a>
          )}
          <NotificationInbox />
          <Avatar className="w-8 h-8 ring-1 ring-purple-500/40"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name?.[0]}</AvatarFallback></Avatar>
          <Button size="icon" variant="ghost" onClick={onLogout} className="text-white/60 hover:text-white"><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>
    </nav>
    <main className="pt-24 pb-20 px-4 max-w-7xl mx-auto">{children}</main>
  </>
);

// ====================================================================
// DASHBOARD
// ====================================================================
const Dashboard = ({ user, matches, hackathons, onSubmitHackathon }) => {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-sm text-white/50 mb-1">Welcome back</div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Hey {user.name?.split(' ')[0]} 👋</h1>
        <p className="text-white/60 mt-2">Here's what's happening in the community.</p>
      </motion.div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Top match', v: matches[0] ? `${matches[0].score}%` : '—', i: Sparkles, c: 'from-purple-500 to-pink-500' },
          { l: 'Compatible devs', v: matches.filter((m) => m.score >= 60).length, i: Users, c: 'from-blue-500 to-cyan-500' },
          { l: 'Your skills', v: user.skills?.length || 0, i: Code2, c: 'from-amber-500 to-orange-500' },
          { l: 'Open hackathons', v: hackathons.length, i: Trophy, c: 'from-green-500 to-emerald-500' },
        ].map((s, i) => (
          <motion.div key={s.l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-2xl p-4 relative overflow-hidden">
            <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${s.c} opacity-20 blur-2xl`} />
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.c} flex items-center justify-center mb-2`}><s.i className="w-4 h-4" /></div>
            <div className="text-2xl font-bold">{s.v}</div>
            <div className="text-xs text-white/50 mt-1">{s.l}</div>
          </motion.div>
        ))}
      </div>
      <div>
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" /> Trending hackathons</h2>
            <p className="text-sm text-white/50 mt-1">Pick an event, register, and start building.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onSubmitHackathon} className="text-purple-300 hover:text-white"><Plus className="w-4 h-4 mr-1" /> Submit a hackathon</Button>
            <a href="/hackathons"><Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">See all <ArrowRight className="w-4 h-4 ml-1" /></Button></a>
          </div>
        </div>
        {hackathons.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-white/50">No hackathons yet — be the first to submit one.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {hackathons.slice(0, 6).map((h, i) => <HackathonCard key={h.id} h={h} delay={i * 0.05} />)}
          </div>
        )}
      </div>
    </div>
  );
};

// ====================================================================
// MATCH CARD
// ====================================================================
const MatchCard = ({ m, onClick, onMessage, delay = 0 }) => {
  const { developer: d, score, breakdown } = m;
  const tier = score >= 80 ? 'top' : score >= 60 ? 'great' : score >= 40 ? 'good' : 'fair';
  const tierColor = { top: 'text-purple-300', great: 'text-blue-300', good: 'text-cyan-300', fair: 'text-white/50' }[tier];
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} whileHover={{ y: -4, scale: 1.01 }}
      onClick={onClick} className="glass rounded-2xl p-5 cursor-pointer relative overflow-hidden group">
      {score >= 80 && <div className="absolute inset-0 gradient-border rounded-2xl" />}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
      <div className="flex items-start gap-3 relative">
        <div className="relative">
          <Avatar className="w-14 h-14 ring-2 ring-white/10"><AvatarImage src={d.avatar} /><AvatarFallback>{d.name?.[0]}</AvatarFallback></Avatar>
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full ring-2 ring-[#0a0816]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{d.name}</div>
          <div className="text-xs text-white/50 truncate">{d.college}</div>
          <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${tierColor}`}>{tier} match</div>
        </div>
        <MatchRing score={score} size={64} stroke={5} />
      </div>
      <p className="text-xs text-white/60 line-clamp-2 mt-3 relative">{d.bio}</p>
      <div className="mt-3 space-y-2 relative">
        {breakdown.complementarySkills.length > 0 && (
          <div>
            <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Brings to your stack</div>
            <div className="flex flex-wrap gap-1">{breakdown.complementarySkills.slice(0, 3).map((s) => <Badge key={s} className="bg-purple-500/20 text-purple-300 border-0 text-[10px]">+ {s}</Badge>)}</div>
          </div>
        )}
        {breakdown.sharedInterests.length > 0 && (
          <div>
            <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Shared passions</div>
            <div className="flex flex-wrap gap-1">{breakdown.sharedInterests.slice(0, 3).map((s) => <Badge key={s} className="bg-cyan-500/20 text-cyan-300 border-0 text-[10px]">{s}</Badge>)}</div>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-4 relative">
        <Button size="sm" onClick={(e) => { e.stopPropagation(); onMessage(); }} className="flex-1 gradient-button text-white border-0 h-8 text-xs"><Heart className="w-3 h-3 mr-1" /> Connect</Button>
        <Button size="sm" onClick={(e) => { e.stopPropagation(); onClick(); }} variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 h-8 text-xs">View</Button>
      </div>
    </motion.div>
  );
};

// ====================================================================
// MATCHES VIEW
// ====================================================================
const MatchesView = ({ user, onViewDev, onMessage, onOpenTeam }) => {
  const [registered, setRegistered] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api('/my/hackathons').then((d) => {
      setRegistered(d.hackathons);
      if (d.hackathons.length > 0) setSelectedId(d.hackathons[0].id);
    }).catch(() => setRegistered([]));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingData(true);
    setFilter('all');
    api(`/hackathons/${selectedId}/matches`).then(setData).catch(() => setData({ matches: [], teams: [] })).finally(() => setLoadingData(false));
  }, [selectedId]);

  if (registered === null) {
    return <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-2xl h-64 animate-pulse" />)}</div>;
  }

  if (registered.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your matches</h1>
          <p className="text-white/60 mt-2">Register for a hackathon to see compatible teammates and teams for it.</p>
        </div>
        <div className="glass rounded-2xl p-12 text-center text-white/50">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="mb-4">You're not registered for any hackathons yet.</p>
          <a href="/hackathons"><Button className="gradient-button text-white border-0">Browse hackathons</Button></a>
        </div>
      </div>
    );
  }

  const matches = data?.matches || [];
  const teams = data?.teams || [];
  const filtered = matches.filter((m) => filter === 'all' || (filter === 'top' && m.score >= 80) || (filter === 'great' && m.score >= 60));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your matches</h1>
        <p className="text-white/60 mt-2">Compatible teammates and teams, per hackathon you're registered for.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {registered.map((h) => (
          <button key={h.id} onClick={() => setSelectedId(h.id)}
            className={`px-4 py-2 rounded-full border text-sm transition ${selectedId === h.id ? 'bg-gradient-to-r from-purple-500 to-blue-500 border-transparent text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}>
            {h.name}
          </button>
        ))}
      </div>

      {loadingData ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-2xl h-64 animate-pulse" />)}</div>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /> Matches for this hackathon</h2>
              <div className="flex gap-2">
                {[{ k: 'all', l: `All (${matches.length})` }, { k: 'top', l: `Top (${matches.filter((m) => m.score >= 80).length})` }, { k: 'great', l: `Great+ (${matches.filter((m) => m.score >= 60).length})` }].map((f) => (
                  <Button key={f.k} onClick={() => setFilter(f.k)} variant={filter === f.k ? 'default' : 'outline'} size="sm" className={filter === f.k ? 'gradient-button text-white border-0' : 'bg-white/5 border-white/10 hover:bg-white/10'}>{f.l}</Button>
                ))}
              </div>
            </div>
            {matches.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-white/50 text-sm">No one else has registered for this hackathon yet.</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map((m, i) => <MatchCard key={m.developer.id} m={m} onClick={() => onViewDev(m.developer)} onMessage={() => onMessage(m.developer)} delay={i * 0.03} />)}</div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-400" /> Teams for this hackathon</h2>
            {teams.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-white/50 text-sm">No teams yet — be the first to create one.</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((t) => <TeamCard key={t.id} team={t} mine={t.members?.some((m) => m.userId === user.id)} onOpen={() => onOpenTeam(t.id)} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ====================================================================
// PROFILE VIEW (with GitHub stats)
// ====================================================================
const ProfileView = ({ user, onEdit, onOpenTeam }) => {
  const [github, setGithub] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [teams, setTeams] = useState(null);
  const [matchCount, setMatchCount] = useState(null);

  useEffect(() => {
    if (user.github) {
      setGithubLoading(true);
      api(`/github/${encodeURIComponent(user.github)}`).then(setGithub).catch(() => {}).finally(() => setGithubLoading(false));
    }
  }, [user.github]);

  useEffect(() => {
    api('/teams?mine=true').then((d) => setTeams(d.teams)).catch(() => setTeams([]));
    api('/matches').then((d) => setMatchCount(d.matches.filter((m) => m.score >= 60).length)).catch(() => setMatchCount(0));
  }, []);

  const memberSince = user.createdAt && new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const stats = [
    { label: 'Teams', value: teams === null ? '—' : teams.length, icon: Layers, color: 'from-blue-500 to-cyan-500' },
    { label: 'Strong matches', value: matchCount === null ? '—' : matchCount, icon: Heart, color: 'from-purple-500 to-pink-500' },
    { label: 'Skills listed', value: user.skills?.length || 0, icon: Code2, color: 'from-amber-500 to-orange-500' },
    { label: 'Status', value: user.verified ? 'Verified' : 'Unverified', icon: user.verified ? ShieldCheck : Shield, color: user.verified ? 'from-green-500 to-emerald-500' : 'from-white/20 to-white/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-strong rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-cyan-500/10" />
        <div className="relative flex flex-col md:flex-row items-start gap-6">
          <Avatar className="w-28 h-28 ring-4 ring-purple-500/40 glow-purple"><AvatarImage src={user.avatar} /><AvatarFallback className="text-3xl">{user.name?.[0]}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{user.name}</h1>
              {user.verified && (
                <span title="Verified"><ShieldCheck className="w-5 h-5 text-cyan-400" /></span>
              )}
            </div>
            <p className="text-white/60 mt-1">{user.college}{user.college && user.year ? ' · ' : ''}{user.year}</p>
            {memberSince && <p className="text-xs text-white/40 mt-1">Member since {memberSince}</p>}
            <p className="text-white/70 mt-3 max-w-2xl">{user.bio || <span className="text-white/40 italic">No bio yet — add one so teammates know what you build.</span>}</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              {user.github && <a href={user.github.startsWith('http') ? user.github : `https://github.com/${user.github}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="bg-white/5 border-white/10"><Github className="w-3 h-3 mr-1" /> GitHub</Button></a>}
              {user.linkedin && <a href={user.linkedin} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="bg-white/5 border-white/10"><Linkedin className="w-3 h-3 mr-1" /> LinkedIn</Button></a>}
              <Button size="sm" onClick={onEdit} className="gradient-button text-white border-0">Edit profile</Button>
            </div>
          </div>
          <Badge className="bg-purple-500/20 text-purple-300 border-0 capitalize">{user.experience}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4 relative overflow-hidden">
            <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${s.color} opacity-20 blur-2xl`} />
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-2 relative`}><s.icon className="w-4 h-4" /></div>
            <div className="text-xl font-bold relative capitalize">{s.value}</div>
            <div className="text-xs text-white/50 mt-0.5 relative">{s.label}</div>
          </div>
        ))}
      </div>

      {!user.verified && (
        <div className="glass rounded-2xl p-4 flex items-center gap-3 border border-cyan-500/20">
          <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <p className="text-sm text-white/70 flex-1">
            Your profile isn't verified yet. Add a GitHub or LinkedIn link and fill out your skills to boost your credibility with teammates and speed up admin review.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Code2 className="w-4 h-4 text-purple-400" /> Skills</h3>
          {user.skills?.length > 0 ? (
            <div className="flex flex-wrap gap-2">{user.skills.map((s) => <Badge key={s} className="bg-purple-500/20 text-purple-300 border-0">{s}</Badge>)}</div>
          ) : <p className="text-sm text-white/40">No skills added yet.</p>}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Heart className="w-4 h-4 text-cyan-400" /> Interests</h3>
          {user.interests?.length > 0 ? (
            <div className="flex flex-wrap gap-2">{user.interests.map((s) => <Badge key={s} className="bg-cyan-500/20 text-cyan-300 border-0">{s}</Badge>)}</div>
          ) : <p className="text-sm text-white/40">No interests added yet.</p>}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" /> Availability</h3>
          {user.availability?.length > 0 ? (
            <div className="flex flex-wrap gap-2">{user.availability.map((s) => <Badge key={s} className="bg-blue-500/20 text-blue-300 border-0">{s}</Badge>)}</div>
          ) : <p className="text-sm text-white/40">No availability set yet.</p>}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-amber-400" /> Experience</h3>
          <div className="space-y-2">
            {EXPERIENCE.map((e) => (
              <div key={e.v} className={`flex items-center justify-between p-2 rounded-lg ${user.experience === e.v ? 'bg-purple-500/20' : ''}`}>
                <span className="text-sm">{e.l}</span><span className="text-xs text-white/50">{e.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* My teams */}
      <div>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-purple-400" /> My teams</h3>
        {teams === null ? (
          <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="glass rounded-2xl h-32 animate-pulse" />)}</div>
        ) : teams.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-white/50 text-sm">You haven't joined or created a team yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {teams.map((t) => <TeamCard key={t.id} team={t} mine onOpen={() => onOpenTeam(t.id)} />)}
          </div>
        )}
      </div>

      {/* GitHub stats */}
      {user.github && (
        <div className="glass-strong rounded-3xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Github className="w-4 h-4" /> Verified by GitHub</h3>
          {githubLoading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>}
          {!githubLoading && !github && <p className="text-white/50 text-sm">Could not load GitHub profile.</p>}
          {github && <GitHubStats data={github} />}
        </div>
      )}
    </div>
  );
};

// ====================================================================
// GITHUB STATS
// ====================================================================
const GitHubStats = ({ data }) => {
  const langData = data.languages.slice(0, 6).map((l, i) => ({ ...l, fill: CHART_COLORS[i] }));
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 ring-2 ring-white/10"><AvatarImage src={data.avatar} /><AvatarFallback>{data.username?.[0]}</AvatarFallback></Avatar>
          <div>
            <div className="font-bold">{data.name || data.username}</div>
            <a href={`https://github.com/${data.username}`} target="_blank" rel="noreferrer" className="text-sm text-purple-300">@{data.username}</a>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-3 text-center"><div className="text-2xl font-bold">{data.publicRepos}</div><div className="text-[10px] text-white/50 uppercase">repos</div></div>
          <div className="glass rounded-xl p-3 text-center"><div className="text-2xl font-bold">{data.stars}</div><div className="text-[10px] text-white/50 uppercase">stars</div></div>
          <div className="glass rounded-xl p-3 text-center"><div className="text-2xl font-bold">{data.followers}</div><div className="text-[10px] text-white/50 uppercase">followers</div></div>
        </div>
        {data.topRepos?.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-white/50 uppercase tracking-wider">Top repos</div>
            {data.topRepos.slice(0, 3).map((r) => (
              <a key={r.name} href={r.url} target="_blank" rel="noreferrer" className="block glass rounded-xl p-3 hover:bg-white/10 transition">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm truncate">{r.name}</div>
                  <div className="flex items-center gap-1 text-xs text-white/50"><Star className="w-3 h-3" /> {r.stars}</div>
                </div>
                {r.description && <p className="text-xs text-white/50 line-clamp-1 mt-1">{r.description}</p>}
                {r.language && <Badge className="bg-purple-500/20 text-purple-300 border-0 text-[10px] mt-2">{r.language}</Badge>}
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="glass rounded-2xl p-4">
        <div className="text-xs text-white/50 uppercase tracking-wider mb-3">Language confidence</div>
        {langData.length === 0 ? <div className="text-white/50 text-sm">No language data found.</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={langData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" stroke="rgba(255,255,255,0.2)" fontSize={10} />
              <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.6)" fontSize={11} width={70} />
              <Tooltip contentStyle={{ background: 'rgba(15,13,28,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>{langData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// ====================================================================
// DEVELOPER DETAIL
// ====================================================================
const DeveloperDetail = ({ dev, onConnect }) => (
  <div className="p-2">
    <div className="relative h-32 -mx-6 -mt-6 mb-4 rounded-t-lg overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 opacity-50" />
      <div className="absolute inset-0 grid-pattern opacity-50" />
    </div>
    <div className="flex items-start gap-4 -mt-16 relative px-4">
      <Avatar className="w-24 h-24 ring-4 ring-[#0a0816]"><AvatarImage src={dev.avatar} /><AvatarFallback className="text-2xl">{dev.name?.[0]}</AvatarFallback></Avatar>
      <div className="pt-12 flex-1"><h2 className="text-2xl font-bold">{dev.name}</h2><p className="text-sm text-white/60">{dev.college} · {dev.year}</p></div>
    </div>
    <p className="text-sm text-white/70 mt-4 px-4">{dev.bio}</p>
    <div className="mt-5 px-4 space-y-4">
      <div><div className="text-xs text-white/50 uppercase tracking-wider mb-2">Skills</div>
        <div className="flex flex-wrap gap-1.5">{dev.skills?.map((s) => <Badge key={s} className="bg-purple-500/20 text-purple-300 border-0">{s}</Badge>)}</div></div>
      <div><div className="text-xs text-white/50 uppercase tracking-wider mb-2">Interests</div>
        <div className="flex flex-wrap gap-1.5">{dev.interests?.map((s) => <Badge key={s} className="bg-cyan-500/20 text-cyan-300 border-0">{s}</Badge>)}</div></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-3"><div className="text-xs text-white/50 mb-1">Experience</div><div className="font-semibold capitalize">{dev.experience}</div></div>
        <div className="glass rounded-xl p-3"><div className="text-xs text-white/50 mb-1">Available</div><div className="font-semibold text-sm">{dev.availability?.join(', ')}</div></div>
      </div>
      <div className="flex gap-2 pt-2">
        {dev.github && <a href={dev.github.startsWith('http') ? dev.github : `https://github.com/${dev.github}`} target="_blank" rel="noreferrer" className="flex-1"><Button variant="outline" className="w-full bg-white/5 border-white/10"><Github className="w-3 h-3 mr-1" /> GitHub</Button></a>}
        {dev.linkedin && <a href={dev.linkedin} target="_blank" rel="noreferrer" className="flex-1"><Button variant="outline" className="w-full bg-white/5 border-white/10"><Linkedin className="w-3 h-3 mr-1" /> LinkedIn</Button></a>}
        <Button onClick={onConnect} className="flex-1 gradient-button text-white border-0"><MessageSquare className="w-3 h-3 mr-1" /> Connect</Button>
      </div>
    </div>
  </div>
);

// ====================================================================
// TEAMS VIEW
// ====================================================================
const TeamsView = ({ teams, user, onCreate, onOpen, onRefresh }) => {
  const myTeams = teams.filter((t) => t.members.find((m) => m.userId === user.id));
  const others = teams.filter((t) => !t.members.find((m) => m.userId === user.id));
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Teams</h1>
          <p className="text-white/60 mt-2">Build something amazing with the right people.</p>
        </div>
        <Button onClick={onCreate} className="gradient-button text-white border-0"><Plus className="w-4 h-4 mr-1" /> Create team</Button>
      </div>
      {myTeams.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-purple-400" /> Your teams</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{myTeams.map((t) => <TeamCard key={t.id} team={t} mine onOpen={() => onOpen(t.id)} />)}</div>
        </div>
      )}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-cyan-400" /> Discover teams</h2>
        {others.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-white/50">No public teams yet. Be the first to create one!</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{others.map((t) => <TeamCard key={t.id} team={t} onOpen={() => onOpen(t.id)} />)}</div>
        )}
      </div>
    </div>
  );
};

const TeamCard = ({ team, mine, onOpen }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}
    onClick={onOpen} className="glass rounded-2xl p-5 cursor-pointer relative overflow-hidden group">
    <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
    <div className="relative">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center"><Users className="w-5 h-5" /></div>
        {mine && <Badge className="bg-purple-500/20 text-purple-300 border-0 text-[10px]">Member</Badge>}
      </div>
      <h3 className="font-bold text-lg">{team.name}</h3>
      <p className="text-xs text-white/60 mt-1 line-clamp-2 min-h-[2rem]">{team.description || 'No description'}</p>
      <div className="flex items-center justify-between mt-4">
        <div className="flex -space-x-2">{team.members.slice(0, 4).map((m) => (
          <Avatar key={m.userId} className="w-7 h-7 ring-2 ring-[#0a0816]"><AvatarImage src={m.avatar} /><AvatarFallback className="text-[10px]">{m.name?.[0]}</AvatarFallback></Avatar>
        ))}{team.members.length > 4 && <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] ring-2 ring-[#0a0816]">+{team.members.length - 4}</div>}</div>
        <div className="text-xs text-white/50">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</div>
      </div>
      {team.rolesNeeded?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">{team.rolesNeeded.slice(0, 3).map((r) => <Badge key={r} className="bg-cyan-500/20 text-cyan-300 border-0 text-[10px]">{r}</Badge>)}</div>
      )}
    </div>
  </motion.div>
);

// ====================================================================
// CREATE TEAM FORM
// ====================================================================
const CreateTeamForm = ({ onCreated }) => {
  const [data, setData] = useState({ name: '', description: '', hackathonId: '', rolesNeeded: [] });
  const [creating, setCreating] = useState(false);
  const [registered, setRegistered] = useState(null);
  useEffect(() => { api('/my/hackathons').then((d) => setRegistered(d.hackathons)).catch(() => setRegistered([])); }, []);
  const toggleRole = (r) => setData((d) => ({ ...d, rolesNeeded: d.rolesNeeded.includes(r) ? d.rolesNeeded.filter((x) => x !== r) : [...d.rolesNeeded, r] }));
  const submit = async () => {
    if (!data.name) return toast.error('Team name required');
    setCreating(true);
    try { const res = await api('/teams', { method: 'POST', body: JSON.stringify(data) }); onCreated(res.team); toast.success('Team created!'); }
    catch (e) { toast.error(e.message); } finally { setCreating(false); }
  };
  return (
    <div className="p-2">
      <h2 className="text-2xl font-bold mb-1">Create a team</h2>
      <p className="text-sm text-white/60 mb-6">Define your mission and the roles you need.</p>
      <div className="space-y-3">
        <Input placeholder="Team name *" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="bg-white/5 border-white/10 h-11" />
        <Textarea placeholder="What are you building?" rows={3} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} className="bg-white/5 border-white/10" />
        <div>
          <label className="text-xs text-white/60 mb-2 block">Hackathon (optional — only ones you're registered for)</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setData({ ...data, hackathonId: '' })} className={`p-2 rounded-lg border text-xs ${!data.hackathonId ? 'bg-purple-500/20 border-purple-400' : 'bg-white/5 border-white/10'}`}>None</button>
            {(registered || []).slice(0, 5).map((h) => (
              <button key={h.id} onClick={() => setData({ ...data, hackathonId: h.id })} className={`p-2 rounded-lg border text-xs truncate ${data.hackathonId === h.id ? 'bg-purple-500/20 border-purple-400' : 'bg-white/5 border-white/10'}`}>{h.name}</button>
            ))}
          </div>
          {registered?.length === 0 && (
            <p className="text-[11px] text-white/40 mt-2">You're not registered for any hackathons yet — <a href="/hackathons" className="text-purple-300 underline">browse hackathons</a> to tag your team to one.</p>
          )}
        </div>
        <div>
          <label className="text-xs text-white/60 mb-2 block">Roles needed</label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button key={r} onClick={() => toggleRole(r)}
                className={`px-3 py-1.5 rounded-full border text-xs transition ${data.rolesNeeded.includes(r) ? 'bg-gradient-to-r from-purple-500 to-blue-500 border-transparent' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}>{r}</button>
            ))}
          </div>
        </div>
        <Button onClick={submit} disabled={creating} className="w-full gradient-button text-white border-0 h-11">
          {creating ? 'Creating...' : 'Create team'} <Sparkles className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

const SubmitHackathonForm = ({ onSubmitted }) => {
  const [data, setData] = useState({ name: '', banner: '', domain: '', prize: '', deadline: '', participants: '', college: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!data.name) return toast.error('Hackathon name required');
    setSubmitting(true);
    try {
      await api('/hackathons', { method: 'POST', body: JSON.stringify(data) });
      toast.success("Submitted! It'll appear once an admin reviews it.");
      onSubmitted();
    } catch (e) { toast.error(e.message); } finally { setSubmitting(false); }
  };
  return (
    <div className="p-2">
      <h2 className="text-2xl font-bold mb-1">Submit a hackathon</h2>
      <p className="text-sm text-white/60 mb-6">Know about a hackathon at your college? Add it here — an admin reviews every submission before it goes live.</p>
      <div className="space-y-3">
        <Input placeholder="Hackathon name *" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="bg-white/5 border-white/10 h-11" />
        <Textarea placeholder="Short description (optional)" rows={2} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} className="bg-white/5 border-white/10" />
        <Input placeholder="College (optional)" value={data.college} onChange={(e) => setData({ ...data, college: e.target.value })} className="bg-white/5 border-white/10 h-11" />
        <Input placeholder="Banner image URL (optional)" value={data.banner} onChange={(e) => setData({ ...data, banner: e.target.value })} className="bg-white/5 border-white/10 h-11" />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Domain (AI, Web3...)" value={data.domain} onChange={(e) => setData({ ...data, domain: e.target.value })} className="bg-white/5 border-white/10" />
          <Input placeholder="Prize ($5,000)" value={data.prize} onChange={(e) => setData({ ...data, prize: e.target.value })} className="bg-white/5 border-white/10" />
          <Input placeholder="Deadline (2026-09-01)" value={data.deadline} onChange={(e) => setData({ ...data, deadline: e.target.value })} className="bg-white/5 border-white/10" />
          <Input placeholder="Expected participants" value={data.participants} onChange={(e) => setData({ ...data, participants: e.target.value })} className="bg-white/5 border-white/10" />
        </div>
        <Button onClick={submit} disabled={submitting} className="w-full gradient-button text-white border-0 h-11">
          {submitting ? 'Submitting...' : 'Submit for review'} <Sparkles className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

// ====================================================================
// TEAM DETAIL (chat + AI panel)
// ====================================================================
const TeamDetail = ({ teamId, user, onBack }) => {
  const [team, setTeam] = useState(null);
  const [tab, setTab] = useState('chat');
  const [refresh, setRefresh] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  useEffect(() => { api(`/teams/${teamId}`).then((d) => setTeam(d.team)).catch((e) => toast.error(e.message)); }, [teamId, refresh]);
  if (!team) return <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;
  const isMember = team.members.find((m) => m.userId === user.id);
  const isOwner = team.ownerId === user.id;
  const pending = team.joinRequests?.filter((r) => r.status === 'pending') || [];

  const requestJoin = async () => {
    try { await api(`/teams/${teamId}/join`, { method: 'POST', body: JSON.stringify({ message: '' }) }); toast.success('Join request sent!'); setRefresh((r) => r + 1); }
    catch (e) { toast.error(e.message); }
  };
  const handleRequest = async (userId, action) => {
    try { await api(`/teams/${teamId}/join/${userId}`, { method: 'PUT', body: JSON.stringify({ action }) }); toast.success(action === 'approve' ? 'Approved!' : 'Rejected'); setRefresh((r) => r + 1); }
    catch (e) { toast.error(e.message); }
  };
  const removeMember = async (userId, name) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try { await api(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }); toast.success(`${name} removed`); setRefresh((r) => r + 1); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="text-white/60 hover:text-white"><ChevronRight className="w-4 h-4 rotate-180 mr-1" /> All teams</Button>
      <div className="glass-strong rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/15 via-blue-600/10 to-cyan-500/15" />
        <div className="relative flex flex-col md:flex-row items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0"><Users className="w-7 h-7" /></div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <p className="text-white/60 mt-1">{team.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">{team.rolesNeeded?.map((r) => <Badge key={r} className="bg-cyan-500/20 text-cyan-300 border-0">{r}</Badge>)}</div>
          </div>
          {!isMember && <Button onClick={requestJoin} className="gradient-button text-white border-0"><UserPlus className="w-4 h-4 mr-1" /> Request to join</Button>}
        </div>
      </div>

      {!isMember && (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-white/60">Join this team to access chat and AI strategy tools.</p>
        </div>
      )}

      {isMember && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/5">
            <TabsTrigger value="chat"><MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Chat</TabsTrigger>
            <TabsTrigger value="ai"><Brain className="w-3.5 h-3.5 mr-1.5" /> AI Strategy</TabsTrigger>
            <TabsTrigger value="members"><Users className="w-3.5 h-3.5 mr-1.5" /> Members ({team.members.length})</TabsTrigger>
            {isOwner && pending.length > 0 && <TabsTrigger value="requests"><UserPlus className="w-3.5 h-3.5 mr-1.5" /> Requests <Badge className="ml-1.5 bg-purple-500 text-white border-0 text-[10px] px-1.5">{pending.length}</Badge></TabsTrigger>}
          </TabsList>
          <TabsContent value="chat" className="mt-4"><ChatPanel teamId={teamId} user={user} /></TabsContent>
          <TabsContent value="ai" className="mt-4"><AIPanel teamId={teamId} /></TabsContent>
          <TabsContent value="members" className="mt-4">
            {isOwner && (
              <div className="mb-4 flex justify-end">
                <Button onClick={() => setInviteOpen(true)} className="gradient-button text-white border-0">
                  <UserPlus className="w-4 h-4 mr-1.5" /> Invite teammates
                </Button>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-3">{team.members.map((m) => (
              <div key={m.userId} className="glass rounded-2xl p-4 flex items-center gap-3">
                <Avatar className="w-12 h-12 ring-2 ring-purple-500/20"><AvatarImage src={m.avatar} /><AvatarFallback>{m.name?.[0]}</AvatarFallback></Avatar>
                <div className="flex-1"><div className="font-semibold">{m.name}</div><Badge className="bg-purple-500/20 text-purple-300 border-0 text-[10px] mt-1">{m.role}</Badge></div>
                {team.ownerId === m.userId && <Badge className="bg-amber-500/20 text-amber-300 border-0 text-[10px]">Owner</Badge>}
                {isOwner && team.ownerId !== m.userId && (
                  <Button size="icon" variant="ghost" onClick={() => removeMember(m.userId, m.name)} className="text-white/40 hover:text-red-300 hover:bg-red-500/10 w-8 h-8">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}</div>
          </TabsContent>
          {isOwner && (
            <TabsContent value="requests" className="mt-4">
              <div className="space-y-3">{pending.length === 0 ? <div className="glass rounded-2xl p-8 text-center text-white/50">No pending requests</div> : pending.map((r) => (
                <div key={r.userId} className="glass rounded-2xl p-4 flex items-center gap-3">
                  <Avatar className="w-12 h-12"><AvatarImage src={r.avatar} /><AvatarFallback>{r.name?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1"><div className="font-semibold">{r.name}</div>{r.message && <p className="text-xs text-white/50 mt-1">"{r.message}"</p>}</div>
                  <Button size="sm" onClick={() => handleRequest(r.userId, 'approve')} className="gradient-button text-white border-0">Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => handleRequest(r.userId, 'reject')} className="bg-white/5 border-white/10">Reject</Button>
                </div>
              ))}</div>
            </TabsContent>
          )}
        </Tabs>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-2xl glass-strong border-white/10 max-h-[85vh] overflow-y-auto">
          <InviteMembersModal team={team} onClose={() => setInviteOpen(false)} onInvited={() => { setInviteOpen(false); setRefresh((r) => r + 1); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ====================================================================
// INVITE MEMBERS MODAL
// ====================================================================
const InviteMembersModal = ({ team, onClose, onInvited }) => {
  const [devs, setDevs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    api('/developers').then((d) => setDevs(d.developers)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const memberIds = new Set(team.members.map((m) => m.userId));
  const filtered = devs.filter((d) => !memberIds.has(d.id) && (
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
    d.college?.toLowerCase().includes(search.toLowerCase())
  ));

  const addMember = async (userId, name) => {
    setAdding(userId);
    try {
      await api(`/teams/${team._id}/members`, { method: 'POST', body: JSON.stringify({ userId, role: 'Member' }) });
      toast.success(`${name} added to the team!`);
      onInvited();
    } catch (e) { toast.error(e.message); } finally { setAdding(null); }
  };

  return (
    <div className="p-2">
      <h2 className="text-2xl font-bold mb-1">Invite teammates</h2>
      <p className="text-sm text-white/60 mb-4">Add developers directly to your team. They'll get access immediately.</p>
      <Input placeholder="Search by name, skill, or college..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white/5 border-white/10 mb-4" />
      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {loading && <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" /></div>}
        {!loading && filtered.length === 0 && <div className="text-center py-8 text-white/50 text-sm">No developers found.</div>}
        {filtered.slice(0, 50).map((d) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-3 flex items-center gap-3">
            <Avatar className="w-10 h-10 ring-1 ring-purple-500/20"><AvatarImage src={d.avatar} /><AvatarFallback>{d.name?.[0]}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{d.name}</div>
              <div className="text-xs text-white/50 truncate">{d.college} · {d.experience}</div>
              <div className="flex flex-wrap gap-1 mt-1">{d.skills?.slice(0, 4).map((s) => <Badge key={s} className="bg-white/5 text-white/70 border-0 text-[9px]">{s}</Badge>)}</div>
            </div>
            <Button size="sm" disabled={adding === d.id} onClick={() => addMember(d.id, d.name)} className="gradient-button text-white border-0">
              {adding === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5 mr-1" /> Add</>}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ====================================================================
// CHAT PANEL (polling-based real-time)
// ====================================================================
const ChatPanel = ({ teamId, user }) => {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const lastFetchRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);

  // poll every 2s
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const params = lastFetchRef.current ? `?since=${encodeURIComponent(lastFetchRef.current)}` : '';
        const data = await api(`/teams/${teamId}/messages${params}`);
        if (data.messages?.length) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const newOnes = data.messages.filter((m) => !ids.has(m.id));
            if (!newOnes.length) return prev;
            const all = [...prev, ...newOnes];
            lastFetchRef.current = all[all.length - 1].createdAt;
            return all;
          });
        }
        setTyping(data.typing || []);
      } catch {}
    };
    fetchMessages();
    const id = setInterval(fetchMessages, 2000);
    return () => clearInterval(id);
  }, [teamId]);

  // auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, typing.length]);

  const handleType = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      api(`/teams/${teamId}/typing`, { method: 'POST', body: '{}' }).catch(() => {});
    }, 200);
  };

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try { await api(`/teams/${teamId}/messages`, { method: 'POST', body: JSON.stringify({ content: input }) }); setInput(''); }
    catch (e) { toast.error(e.message); } finally { setSending(false); }
  };

  return (
    <div className="glass-strong rounded-2xl flex flex-col h-[60vh] min-h-[400px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scroll-hide">
        {messages.length === 0 && <div className="text-center text-white/40 text-sm py-12">No messages yet. Say hi 👋</div>}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const isMe = m.userId === user.id;
            const isSystem = m.system;
            const prevMsg = messages[i - 1];
            const showAvatar = !prevMsg || prevMsg.userId !== m.userId;
            if (isSystem) return (
              <motion.div key={m.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <Badge className="bg-white/5 text-white/50 border-white/10 text-[10px]">{m.content}</Badge>
              </motion.div>
            );
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {showAvatar ? (
                  <Avatar className="w-8 h-8 mt-0.5"><AvatarImage src={m.userAvatar} /><AvatarFallback className="text-[10px]">{m.userName?.[0]}</AvatarFallback></Avatar>
                ) : <div className="w-8 flex-shrink-0" />}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : ''} flex flex-col`}>
                  {showAvatar && <div className={`text-[10px] text-white/40 mb-0.5 ${isMe ? 'text-right' : ''}`}>{m.userName} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                  <div className={`px-3.5 py-2 rounded-2xl text-sm ${isMe ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'}`}>{m.content}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {typing.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-white/50">
            <div className="flex gap-0.5"><span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} /><span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} /></div>
            {typing.map((t) => t.name).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...
          </motion.div>
        )}
      </div>
      <div className="border-t border-white/10 p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => { setInput(e.target.value); handleType(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message..."
          className="bg-white/5 border-white/10 flex-1"
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !input.trim()} className="gradient-button text-white border-0"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
};

// ====================================================================
// MESSAGES (direct messages between two users)
// ====================================================================
const MessagesView = ({ onOpen }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api('/conversations').then((d) => setConversations(d.conversations)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Messages</h1>
        <p className="text-white/60 mt-2">Direct conversations with other developers.</p>
      </div>
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass rounded-2xl h-20 animate-pulse" />)}</div>
      ) : conversations.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-white/50">
          No conversations yet. Hit "Connect" on a developer's profile to start one.
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <motion.div key={c.conversationId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => onOpen(c.otherUser)} className="glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition">
              <Avatar className="w-11 h-11"><AvatarImage src={c.otherUser.avatar} /><AvatarFallback>{c.otherUser.name?.[0]}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{c.otherUser.name}</span>
                  {c.unread > 0 && <span className="w-2 h-2 rounded-full bg-purple-400" />}
                </div>
                <p className={`text-xs truncate mt-0.5 ${c.unread > 0 ? 'text-white/90 font-medium' : 'text-white/50'}`}>
                  {c.lastMessageFromMe ? 'You: ' : ''}{c.lastMessage}
                </p>
              </div>
              <div className="text-[10px] text-white/40 flex-shrink-0">{timeAgo(c.lastMessageAt)}</div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const DMThread = ({ user, otherUser, onBack }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <Button variant="ghost" onClick={onBack} className="text-white/60 hover:text-white"><ChevronRight className="w-4 h-4 rotate-180 mr-1" /> All messages</Button>
    </div>
    <div className="flex items-center gap-3">
      <Avatar className="w-10 h-10"><AvatarImage src={otherUser.avatar} /><AvatarFallback>{otherUser.name?.[0]}</AvatarFallback></Avatar>
      <div className="font-bold text-lg">{otherUser.name}</div>
    </div>
    <DMChatPanel otherUser={otherUser} user={user} />
  </div>
);

const DMChatPanel = ({ otherUser, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const lastFetchRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    lastFetchRef.current = null;
    const fetchMessages = async () => {
      try {
        const params = lastFetchRef.current ? `?since=${encodeURIComponent(lastFetchRef.current)}` : '';
        const data = await api(`/messages/${otherUser.id}${params}`);
        if (data.messages?.length) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const newOnes = data.messages.filter((m) => !ids.has(m.id));
            if (!newOnes.length) return prev;
            const all = [...prev, ...newOnes];
            lastFetchRef.current = all[all.length - 1].createdAt;
            return all;
          });
        }
      } catch {}
    };
    fetchMessages();
    const id = setInterval(fetchMessages, 2000);
    return () => clearInterval(id);
  }, [otherUser.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try { await api(`/messages/${otherUser.id}`, { method: 'POST', body: JSON.stringify({ content: input }) }); setInput(''); }
    catch (e) { toast.error(e.message); } finally { setSending(false); }
  };

  return (
    <div className="glass-strong rounded-2xl flex flex-col h-[60vh] min-h-[400px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scroll-hide">
        {messages.length === 0 && <div className="text-center text-white/40 text-sm py-12">No messages yet. Say hi 👋</div>}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const isMe = m.fromUserId === user.id;
            const prevMsg = messages[i - 1];
            const showAvatar = !prevMsg || prevMsg.fromUserId !== m.fromUserId;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {showAvatar ? (
                  <Avatar className="w-8 h-8 mt-0.5"><AvatarImage src={isMe ? user.avatar : otherUser.avatar} /><AvatarFallback className="text-[10px]">{m.fromUserName?.[0]}</AvatarFallback></Avatar>
                ) : <div className="w-8 flex-shrink-0" />}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : ''} flex flex-col`}>
                  {showAvatar && <div className={`text-[10px] text-white/40 mb-0.5 ${isMe ? 'text-right' : ''}`}>{m.fromUserName} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                  <div className={`px-3.5 py-2 rounded-2xl text-sm ${isMe ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'}`}>{m.content}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="border-t border-white/10 p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`Message ${otherUser.name}...`}
          className="bg-white/5 border-white/10 flex-1"
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !input.trim()} className="gradient-button text-white border-0"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
};

// ====================================================================
// AI PANEL (Gemini)
// ====================================================================
const AIPanel = ({ teamId }) => {
  const [tab, setTab] = useState('ideas');
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ ideas: null, roles: null, balance: null });

  const run = async (kind) => {
    setLoading(true);
    try {
      const body = kind === 'ideas' ? { teamId, theme } : { teamId };
      const data = await api(`/ai/${kind === 'ideas' ? 'project-ideas' : kind === 'roles' ? 'team-roles' : 'team-balance'}`, { method: 'POST', body: JSON.stringify(body) });
      setResults((r) => ({ ...r, [kind]: data }));
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="bg-white/5 mb-4">
        <TabsTrigger value="ideas"><Lightbulb className="w-3.5 h-3.5 mr-1.5" /> Project ideas</TabsTrigger>
        <TabsTrigger value="roles"><Users className="w-3.5 h-3.5 mr-1.5" /> Role assignments</TabsTrigger>
        <TabsTrigger value="balance"><Brain className="w-3.5 h-3.5 mr-1.5" /> Team balance</TabsTrigger>
      </TabsList>
      <TabsContent value="ideas">
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0"><Lightbulb className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="font-bold">AI-generated project ideas</h3>
              <p className="text-xs text-white/60 mt-1">Powered by Gemini. Tailored to your team's combined skills + interests.</p>
            </div>
          </div>
          <Input placeholder="Optional: hackathon theme (e.g. 'AI for healthcare')" value={theme} onChange={(e) => setTheme(e.target.value)} className="bg-white/5 border-white/10" />
          <Button onClick={() => run('ideas')} disabled={loading} className="gradient-button text-white border-0 w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Thinking...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate ideas</>}
          </Button>
          {results.ideas?.ideas && (
            <div className="space-y-3 pt-2">
              {results.ideas.ideas.map((idea, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-strong rounded-xl p-4 gradient-border relative">
                  <h4 className="font-bold text-base">{idea.title}</h4>
                  <p className="text-xs text-purple-300 mb-2">{idea.tagline}</p>
                  <p className="text-sm text-white/70">{idea.description}</p>
                  {idea.techStack && <div className="flex flex-wrap gap-1 mt-3">{idea.techStack.map((t) => <Badge key={t} className="bg-purple-500/20 text-purple-300 border-0 text-[10px]">{t}</Badge>)}</div>}
                  {idea.keyFeatures && <ul className="text-xs text-white/60 mt-3 space-y-1">{idea.keyFeatures.slice(0, 3).map((f, j) => <li key={j} className="flex gap-2"><Check className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" /> {f}</li>)}</ul>}
                  {idea.impact && <div className="text-xs text-cyan-300 mt-3">Impact: {idea.impact}</div>}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>
      <TabsContent value="roles">
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="font-bold">Smart role assignments</h3>
              <p className="text-xs text-white/60 mt-1">AI analyzes each member's skills and suggests their best role.</p>
            </div>
          </div>
          <Button onClick={() => run('roles')} disabled={loading} className="gradient-button text-white border-0 w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Thinking...</> : <><Sparkles className="w-4 h-4 mr-2" /> Suggest roles</>}
          </Button>
          {results.roles?.assignments && (
            <div className="space-y-2 pt-2">
              {results.roles.summary && <p className="text-sm text-white/70 mb-3">{results.roles.summary}</p>}
              {results.roles.assignments.map((a, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="glass-strong rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1"><span className="font-semibold text-sm">{a.name}</span><Badge className="bg-purple-500/20 text-purple-300 border-0 text-[10px]">{a.role}</Badge></div>
                  <p className="text-xs text-white/60">{a.reason}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>
      <TabsContent value="balance">
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0"><Brain className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="font-bold">Team balance analysis</h3>
              <p className="text-xs text-white/60 mt-1">Identify your team's strengths, gaps, and ideal next hires.</p>
            </div>
          </div>
          <Button onClick={() => run('balance')} disabled={loading} className="gradient-button text-white border-0 w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" /> Analyze team</>}
          </Button>
          {results.balance && (
            <div className="space-y-3 pt-2">
              {results.balance.score !== undefined && (
                <div className="flex items-center justify-center"><MatchRing score={results.balance.score} size={120} stroke={8} /></div>
              )}
              {results.balance.strengths?.length > 0 && (
                <div className="glass-strong rounded-xl p-3">
                  <div className="text-xs text-green-400 uppercase tracking-wider mb-2">Strengths</div>
                  <ul className="text-sm space-y-1">{results.balance.strengths.map((s, i) => <li key={i} className="flex gap-2"><Check className="w-3 h-3 text-green-400 flex-shrink-0 mt-1" />{s}</li>)}</ul>
                </div>
              )}
              {results.balance.gaps?.length > 0 && (
                <div className="glass-strong rounded-xl p-3">
                  <div className="text-xs text-amber-400 uppercase tracking-wider mb-2">Gaps</div>
                  <ul className="text-sm space-y-1">{results.balance.gaps.map((s, i) => <li key={i} className="flex gap-2"><X className="w-3 h-3 text-amber-400 flex-shrink-0 mt-1" />{s}</li>)}</ul>
                </div>
              )}
              {results.balance.recommendations?.length > 0 && (
                <div className="glass-strong rounded-xl p-3">
                  <div className="text-xs text-purple-400 uppercase tracking-wider mb-2">Recommended next hires</div>
                  <div className="space-y-2">{results.balance.recommendations.map((r, i) => (
                    <div key={i}><div className="font-semibold text-sm">{r.profile}</div><div className="text-xs text-white/60">{r.why}</div></div>
                  ))}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};
