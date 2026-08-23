'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Sparkles, Users, Calendar, GraduationCap, Search, Plus, Loader2, UserPlus, ArrowLeft, Award, CheckCircle2, Check, X, MapPin } from 'lucide-react';

const SKILLS = ['React', 'Node.js', 'MongoDB', 'Python', 'AI/ML', 'UI/UX', 'Blockchain', 'DevOps', 'App Development', 'TypeScript', 'Go', 'Rust', 'Solidity', 'Figma', 'PostgreSQL', 'GraphQL', 'AWS', 'Docker'];

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

const Orbs = () => null;

function daysLeftLabel(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return deadline;
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return 'Closed';
  if (days === 0) return 'Last day';
  return `${days} day${days === 1 ? '' : 's'} left`;
}

const HackathonCard = ({ h, delay = 0 }) => (
  <motion.a href={`/hackathons/${h.id}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }}
    whileHover={{ y: -4 }} className="glass rounded-2xl overflow-hidden group block cursor-pointer">
    <div className="relative h-44 overflow-hidden">
      {h.banner ? (
        <img src={h.banner} alt={h.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full bg-neutral-50 flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center"><Sparkles className="w-5 h-5 text-neutral-400" /></div>
          <div className="text-xs text-neutral-400 font-medium">{h.domain || 'Hackathon'}</div>
        </div>
      )}
      {h.organizerLogo && (
        <img src={h.organizerLogo} alt="" loading="lazy" decoding="async" className="absolute bottom-2 left-2 w-8 h-8 rounded-full ring-2 ring-white object-contain bg-white" />
      )}
      <Badge className="absolute top-3 right-3 bg-neutral-900/80 text-white border-0">{h.tag}</Badge>
      {h.matchScore != null && (
        <Badge className="absolute top-3 right-3 mt-8 bg-indigo-600 text-white border-0">{h.matchScore}% match</Badge>
      )}
      {h.college && (
        <Badge className="absolute top-3 left-3 border-0 bg-neutral-900/80 text-white flex items-center gap-1">
          <GraduationCap className="w-3 h-3" /> {h.college}
        </Badge>
      )}
    </div>
    <div className="p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-lg">{h.name}</h3>
          <p className="text-xs text-neutral-500 mt-1">{h.domain}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-neutral-400">Prize pool</div>
          <div className="font-bold gradient-text text-lg">{h.prize}</div>
        </div>
      </div>
      {(h.mode || h.location) && (
        <div className="flex items-center gap-1 text-xs text-neutral-500 mb-2">
          <MapPin className="w-3 h-3" />
          {[h.mode && h.mode[0].toUpperCase() + h.mode.slice(1), h.location].filter(Boolean).join(' · ')}
        </div>
      )}
      {h.skillsRequired?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {h.skillsRequired.slice(0, 4).map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[11px]">{s}</span>
          ))}
          {h.skillsRequired.length > 4 && (
            <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500 text-[11px]">+{h.skillsRequired.length - 4}</span>
          )}
        </div>
      )}
      <div className="flex items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {daysLeftLabel(h.deadline) || h.deadline}</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {h.participants}</span>
      </div>
    </div>
  </motion.a>
);

const HACKATHON_REQUIRED_FIELDS = {
  name: 'Hackathon name', description: 'Description', college: 'College', banner: 'Banner image URL',
  domain: 'Domain', prize: 'Prize', deadline: 'Deadline', participants: 'Expected participants',
  location: 'Location', mode: 'Mode', teamSize: 'Team size', difficulty: 'Difficulty',
};

const SubmitHackathonForm = ({ onSubmitted }) => {
  const [data, setData] = useState({
    name: '', banner: '', domain: '', prize: '', deadline: '', participants: '', college: '', description: '',
    location: '', mode: 'online', teamSize: '1-2', difficulty: 'all-levels', skillsRequired: [], organizerLogo: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [customSkill, setCustomSkill] = useState('');
  const toggleSkill = (s) => setData((d) => ({ ...d, skillsRequired: d.skillsRequired.includes(s) ? d.skillsRequired.filter((x) => x !== s) : [...d.skillsRequired, s] }));
  const addCustomSkill = () => {
    const v = customSkill.trim().slice(0, 30);
    if (!v) return;
    setData((d) => {
      if (d.skillsRequired.some((x) => x.toLowerCase() === v.toLowerCase())) return d;
      if (d.skillsRequired.length >= 20) { toast.error('Max 20 — remove one first'); return d; }
      return { ...d, skillsRequired: [...d.skillsRequired, v] };
    });
    setCustomSkill('');
  };
  const submit = async () => {
    for (const [field, label] of Object.entries(HACKATHON_REQUIRED_FIELDS)) {
      if (!String(data[field] || '').trim()) return toast.error(`${label} is required`);
    }
    if (data.skillsRequired.length === 0) return toast.error('Add at least one required skill');
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
      <p className="text-sm text-neutral-500 mb-6">Know about a hackathon at your college? Add it here — an admin reviews every submission before it goes live. All fields are required except the organizer logo.</p>
      <div className="space-y-3">
        <Input placeholder="Hackathon name *" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="bg-neutral-100 border-neutral-200 h-11" />
        <Textarea placeholder="Short description *" rows={2} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} className="bg-neutral-100 border-neutral-200" />
        <Input placeholder="College *" value={data.college} onChange={(e) => setData({ ...data, college: e.target.value })} className="bg-neutral-100 border-neutral-200 h-11" />
        <Input placeholder="Banner image URL *" value={data.banner} onChange={(e) => setData({ ...data, banner: e.target.value })} className="bg-neutral-100 border-neutral-200 h-11" />
        <Input placeholder="Organizer logo URL (optional)" value={data.organizerLogo} onChange={(e) => setData({ ...data, organizerLogo: e.target.value })} className="bg-neutral-100 border-neutral-200 h-11" />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Domain (AI, Web3...) *" value={data.domain} onChange={(e) => setData({ ...data, domain: e.target.value })} className="bg-neutral-100 border-neutral-200" />
          <Input placeholder="Prize ($5,000) *" value={data.prize} onChange={(e) => setData({ ...data, prize: e.target.value })} className="bg-neutral-100 border-neutral-200" />
          <Input type="date" value={data.deadline} onChange={(e) => setData({ ...data, deadline: e.target.value })} className="bg-neutral-100 border-neutral-200" />
          <Input placeholder="Expected participants *" value={data.participants} onChange={(e) => setData({ ...data, participants: e.target.value })} className="bg-neutral-100 border-neutral-200" />
          <Input placeholder="Location (Bengaluru / Remote) *" value={data.location} onChange={(e) => setData({ ...data, location: e.target.value })} className="bg-neutral-100 border-neutral-200" />
          <select value={data.mode} onChange={(e) => setData({ ...data, mode: e.target.value })} className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 text-sm h-10">
            <option value="online">Online</option><option value="offline">Offline</option><option value="hybrid">Hybrid</option>
          </select>
          <select value={data.teamSize} onChange={(e) => setData({ ...data, teamSize: e.target.value })} className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 text-sm h-10">
            <option value="1-2">1-2 members</option><option value="3-4">3-4 members</option><option value="5-6">5-6 members</option><option value="7+">7+ members</option>
          </select>
          <select value={data.difficulty} onChange={(e) => setData({ ...data, difficulty: e.target.value })} className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 text-sm h-10">
            <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="all-levels">All levels</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-2 block">Skills required *</label>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((s) => (
              <button key={s} type="button" onClick={() => toggleSkill(s)}
                className={`px-3 py-1.5 rounded-full border text-xs transition ${data.skillsRequired.includes(s) ? 'bg-indigo-600 border-transparent text-white' : 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:bg-neutral-100'}`}>
                {s} {data.skillsRequired.includes(s) && <Check className="w-3 h-3 inline ml-1" />}
              </button>
            ))}
            {data.skillsRequired.filter((s) => !SKILLS.includes(s)).map((s) => (
              <button key={s} type="button" onClick={() => toggleSkill(s)} className="px-3 py-1.5 rounded-full border border-transparent text-xs bg-indigo-600 text-white flex items-center gap-1">
                {s} <X className="w-3 h-3" />
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input value={customSkill} onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }}
              maxLength={30} placeholder="Not listed? Add a skill..." className="bg-neutral-100 border-neutral-200 flex-1 h-9 text-sm" />
            <Button type="button" variant="outline" size="sm" onClick={addCustomSkill} className="bg-neutral-100 border-neutral-200 flex-shrink-0 h-9">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button onClick={submit} disabled={submitting} className="w-full gradient-button text-white border-0 h-11">
          {submitting ? 'Submitting...' : 'Submit for review'} <Sparkles className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

const SORT_OPTIONS = [
  { v: 'recent', l: 'Recently added' },
  { v: 'deadline', l: 'Deadline soonest' },
  { v: 'prize', l: 'Prize' },
  { v: 'popularity', l: 'Popularity' },
];

const parsePrize = (p) => parseInt(String(p || '').replace(/[^\d]/g, ''), 10) || 0;

export default function HackathonsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [domainFilter, setDomainFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [teamSizeFilter, setTeamSizeFilter] = useState('all');
  const [minMatch, setMinMatch] = useState(0);
  const [sort, setSort] = useState('recent');

  const load = () => {
    setLoading(true); setError(null);
    api('/hackathons').then((d) => setHackathons(d.hackathons)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) return;
    api('/auth/me').then((d) => setUser(d.user)).catch(() => localStorage.removeItem('token'));
  }, []);

  const domains = [...new Set(hackathons.map((h) => h.domain).filter(Boolean))].sort();
  const canSortByMatch = user?.skills?.length > 0;

  const filtered = hackathons.filter((h) => {
    if (q) {
      const s = q.toLowerCase();
      if (!(h.name?.toLowerCase().includes(s) || h.domain?.toLowerCase().includes(s) || h.college?.toLowerCase().includes(s))) return false;
    }
    if (domainFilter !== 'all' && h.domain !== domainFilter) return false;
    if (modeFilter !== 'all' && h.mode !== modeFilter) return false;
    if (difficultyFilter !== 'all' && h.difficulty !== difficultyFilter) return false;
    if (teamSizeFilter !== 'all' && h.teamSize !== teamSizeFilter) return false;
    if (minMatch > 0 && (h.matchScore ?? -1) < minMatch) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'deadline') return new Date(a.deadline || 0) - new Date(b.deadline || 0);
    if (sort === 'prize') return parsePrize(b.prize) - parsePrize(a.prize);
    if (sort === 'popularity') return (b.registeredCount || 0) - (a.registeredCount || 0);
    if (sort === 'best-match') return (b.matchScore || 0) - (a.matchScore || 0);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const onSubmitClick = () => {
    if (!user) { toast.error('Sign in to submit a hackathon'); router.push('/'); return; }
    setSubmitOpen(true);
  };

  return (
    <div className="min-h-screen relative">
      <Orbs />

      <nav className="fixed top-0 left-0 right-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between glass rounded-2xl px-5 py-2.5">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
            <span className="font-bold tracking-tight">HackSync</span>
          </a>
          <Button variant="ghost" onClick={() => router.push('/')} className="text-neutral-600 hover:text-neutral-900 text-sm">
            {user ? 'Back to dashboard' : 'Sign in'}
          </Button>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-neutral-100 text-neutral-600 border-neutral-200 backdrop-blur">All hackathons</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Find your next hackathon</h1>
          <p className="text-neutral-500 max-w-xl mx-auto">Every event on HackSync — added by admins, plus community submissions verified by the team.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input placeholder="Search by name, domain, college..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 bg-neutral-100 border-neutral-200" />
          </div>
          <Button onClick={onSubmitClick} className="gradient-button text-white border-0"><Plus className="w-4 h-4 mr-1" /> Submit a hackathon</Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 text-sm h-9">
            <option value="all">All domains</option>
            {domains.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 text-sm h-9">
            <option value="all">Any mode</option><option value="online">Online</option><option value="offline">Offline</option><option value="hybrid">Hybrid</option>
          </select>
          <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 text-sm h-9">
            <option value="all">Any difficulty</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="all-levels">All levels</option>
          </select>
          <select value={teamSizeFilter} onChange={(e) => setTeamSizeFilter(e.target.value)} className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 text-sm h-9">
            <option value="all">Any team size</option><option value="1-2">1-2 members</option><option value="3-4">3-4 members</option><option value="5-6">5-6 members</option><option value="7+">7+ members</option>
          </select>
          {canSortByMatch && (
            <select value={minMatch} onChange={(e) => setMinMatch(Number(e.target.value))} className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 text-sm h-9">
              <option value={0}>Any match %</option><option value={50}>50%+ match</option><option value={75}>75%+ match</option><option value={90}>90%+ match</option>
            </select>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 text-sm h-9 ml-auto">
            {canSortByMatch && <option value="best-match">Best match</option>}
            {SORT_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-2xl h-72 animate-pulse" />)}</div>
        ) : error ? (
          <div className="glass rounded-2xl p-8 text-center text-neutral-500">
            Couldn't load hackathons. <button onClick={load} className="text-indigo-600 underline">Try again</button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center text-neutral-400 py-24">
            {hackathons.length === 0 ? 'No hackathons yet.' : 'No hackathons match your filters.'}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map((h, i) => <HackathonCard key={h.id} h={h} delay={i * 0.05} />)}
          </div>
        )}
      </main>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-lg glass-strong border-neutral-200 max-h-[85vh] overflow-y-auto">
          <SubmitHackathonForm onSubmitted={() => setSubmitOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
