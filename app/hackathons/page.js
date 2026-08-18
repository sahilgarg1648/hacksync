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
import { Sparkles, Users, Calendar, GraduationCap, Search, Plus, Loader2, UserPlus, ArrowLeft, Trophy, Award, CheckCircle2 } from 'lucide-react';

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

const Orbs = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/30 blur-[120px] animate-pulse-glow" />
    <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/25 blur-[120px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
    <div className="absolute bottom-[10%] left-[20%] w-[450px] h-[450px] rounded-full bg-cyan-500/20 blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
    <div className="absolute inset-0 grid-pattern opacity-40" />
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

export default function HackathonsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    api('/hackathons').then((d) => setHackathons(d.hackathons)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) return;
    api('/auth/me').then((d) => setUser(d.user)).catch(() => localStorage.removeItem('token'));
  }, []);

  const filtered = hackathons.filter((h) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return h.name?.toLowerCase().includes(s) || h.domain?.toLowerCase().includes(s) || h.college?.toLowerCase().includes(s);
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
            <span className="font-bold tracking-tight">HackSync</span>
          </a>
          <Button variant="ghost" onClick={() => router.push('/')} className="text-white/70 hover:text-white text-sm">
            {user ? 'Back to dashboard' : 'Sign in'}
          </Button>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-white/5 text-white/70 border-white/10 backdrop-blur">All hackathons</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Find your next hackathon</h1>
          <p className="text-white/60 max-w-xl mx-auto">Every event on HackSync — added by admins, plus community submissions verified by the team.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8 items-stretch sm:items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input placeholder="Search by name, domain, college..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 bg-white/5 border-white/10" />
          </div>
          <Button onClick={onSubmitClick} className="gradient-button text-white border-0"><Plus className="w-4 h-4 mr-1" /> Submit a hackathon</Button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-2xl h-72 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-white/40 py-24">
            {hackathons.length === 0 ? 'No hackathons yet.' : 'No hackathons match your search.'}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((h, i) => <HackathonCard key={h.id} h={h} delay={i * 0.05} />)}
          </div>
        )}
      </main>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-lg glass-strong border-white/10">
          <SubmitHackathonForm onSubmitted={() => setSubmitOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
