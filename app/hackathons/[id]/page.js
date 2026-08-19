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
import {
  Sparkles, Users, Calendar, GraduationCap, ArrowLeft, Trophy,
  CheckCircle2, UserPlus, Plus, Loader2,
} from 'lucide-react';

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
    <div className="absolute inset-0 grid-pattern" />
  </div>
);

const ROLES = ['Frontend Engineer', 'Backend Engineer', 'Full-Stack Engineer', 'AI/ML Engineer', 'Mobile Developer', 'UI/UX Designer', 'Blockchain Developer', 'DevOps', 'Product Manager'];

const CreateTeamForHackathon = ({ hackathonId, hackathonName, onCreated }) => {
  const [data, setData] = useState({ name: '', description: '', rolesNeeded: [] });
  const [creating, setCreating] = useState(false);
  const toggleRole = (r) => setData((d) => ({ ...d, rolesNeeded: d.rolesNeeded.includes(r) ? d.rolesNeeded.filter((x) => x !== r) : [...d.rolesNeeded, r] }));
  const submit = async () => {
    if (!data.name) return toast.error('Team name required');
    setCreating(true);
    try {
      const res = await api('/teams', { method: 'POST', body: JSON.stringify({ ...data, hackathonId }) });
      onCreated(res.team);
    } catch (e) { toast.error(e.message); } finally { setCreating(false); }
  };
  return (
    <div className="p-2">
      <h2 className="text-2xl font-bold mb-1">Create a team</h2>
      <p className="text-sm text-neutral-500 mb-6">For <span className="text-neutral-700">{hackathonName}</span></p>
      <div className="space-y-3">
        <Input placeholder="Team name *" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="bg-neutral-100 border-neutral-200 h-11" />
        <Textarea placeholder="What are you building?" rows={3} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} className="bg-neutral-100 border-neutral-200" />
        <div>
          <label className="text-xs text-neutral-500 mb-2 block">Roles needed</label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button key={r} onClick={() => toggleRole(r)}
                className={`px-3 py-1.5 rounded-full border text-xs transition ${data.rolesNeeded.includes(r) ? 'bg-indigo-600 border-transparent text-white' : 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:bg-neutral-100'}`}>{r}</button>
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

export default function HackathonDetailPage({ params }) {
  const router = useRouter();
  const { id } = params;
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joiningId, setJoiningId] = useState(null);

  const load = () => {
    setLoading(true);
    api(`/hackathons/${id}`).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) return;
    api('/auth/me').then((d) => setUser(d.user)).catch(() => localStorage.removeItem('token'));
  }, []);

  const requireAuth = () => {
    if (!user) { toast.error('Sign in first'); router.push('/'); return false; }
    return true;
  };

  const requireRegistration = () => {
    if (!requireAuth()) return false;
    if (!data.hackathon.isRegistered) { toast.error('Register for this hackathon first'); return false; }
    return true;
  };

  const toggleRegister = async () => {
    if (!requireAuth()) return;
    const wasRegistered = data.hackathon.isRegistered;
    setRegistering(true);
    try {
      const res = await api(`/hackathons/${id}/register`, { method: wasRegistered ? 'DELETE' : 'POST' });
      setData((d) => ({ ...d, hackathon: { ...d.hackathon, isRegistered: res.isRegistered, registeredCount: res.registeredCount } }));
      if (!wasRegistered && res.isRegistered) {
        toast.success("You're registered! Here are your matches...");
        router.push(`/?view=matches&hackathon=${id}`);
      } else {
        toast.success(res.isRegistered ? "You're registered!" : 'Unregistered');
      }
    } catch (e) { toast.error(e.message); } finally { setRegistering(false); }
  };

  const joinTeam = async (teamId) => {
    if (!requireRegistration()) return;
    setJoiningId(teamId);
    try { await api(`/teams/${teamId}/join`, { method: 'POST', body: JSON.stringify({ message: '' }) }); toast.success('Join request sent!'); }
    catch (e) { toast.error(e.message); } finally { setJoiningId(null); }
  };

  const onCreateClick = () => { if (requireRegistration()) setCreateOpen(true); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Orbs />
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Orbs />
        <p className="text-neutral-500">Hackathon not found.</p>
        <Button onClick={() => router.push('/hackathons')} variant="outline" className="bg-neutral-100 border-neutral-200">Back to all hackathons</Button>
      </div>
    );
  }

  const { hackathon: h, teams } = data;

  return (
    <div className="min-h-screen relative">
      <Orbs />

      <nav className="fixed top-0 left-0 right-0 z-30 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between glass rounded-2xl px-5 py-2.5">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
            <span className="font-bold tracking-tight">HackSync</span>
          </a>
          <Button variant="ghost" onClick={() => router.push('/hackathons')} className="text-neutral-600 hover:text-neutral-900 text-sm"><ArrowLeft className="w-3.5 h-3.5 mr-1" /> All hackathons</Button>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-4 max-w-5xl mx-auto">
        <div className="glass rounded-3xl overflow-hidden mb-8">
          <div className="relative h-56 md:h-72">
            {h.banner ? (
              <img src={h.banner} alt={h.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-neutral-200 flex items-center justify-center"><Trophy className="w-16 h-16 text-neutral-400" /></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-neutral-900/80 text-white border-0">{h.tag}</Badge>
                {h.college && <Badge className="bg-neutral-900/80 text-white border-0 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {h.college}</Badge>}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">{h.name}</h1>
              <p className="text-white/80 mt-1">{h.domain}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-2xl p-5">
            <div className="text-xs text-neutral-400 mb-1">Prize pool</div>
            <div className="text-2xl font-bold gradient-text">{h.prize}</div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Deadline</div>
            <div className="text-2xl font-bold">{h.deadline}</div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Registered</div>
            <div className="text-2xl font-bold">{h.registeredCount} <span className="text-sm text-neutral-400 font-normal">/ ~{h.participants} expected</span></div>
          </div>
        </div>

        {h.description && (
          <div className="glass rounded-2xl p-6 mb-8">
            <h3 className="font-bold mb-2">About this hackathon</h3>
            <p className="text-neutral-600 leading-relaxed">{h.description}</p>
            {h.submitterName && <p className="text-xs text-neutral-400 mt-3">Submitted by {h.submitterName}</p>}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={toggleRegister} disabled={registering} size="lg"
            className={h.isRegistered ? 'flex-1 bg-neutral-100 border border-neutral-200 hover:bg-neutral-100 h-12' : 'flex-1 gradient-button text-white border-0 h-12'}>
            {h.isRegistered ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Registered — click to unregister</> : <><UserPlus className="w-4 h-4 mr-2" /> Register for this hackathon</>}
          </Button>
          <Button onClick={onCreateClick} size="lg" variant="outline" className="flex-1 rounded-xl bg-neutral-100 border-neutral-200 hover:bg-neutral-100 h-12">
            <Plus className="w-4 h-4 mr-2" /> Create a team
          </Button>
        </div>
        {!h.isRegistered && (
          <p className="text-xs text-neutral-400 mt-2 mb-8">Register above before you can create or join a team for this hackathon.</p>
        )}
        {h.isRegistered && <div className="mb-10" />}

        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-700" /> Teams building for this hackathon</h2>
          {teams.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-neutral-500">No teams yet — be the first to create one.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {teams.map((t) => {
                const mine = t.members?.some((m) => m.userId === user?.id);
                return (
                  <div key={t.id} className="glass rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold">{t.name}</h3>
                      {mine && <Badge className="bg-neutral-100 text-neutral-700 border-0 text-[10px]">Your team</Badge>}
                    </div>
                    <p className="text-xs text-neutral-500 line-clamp-2 mb-3 min-h-[2rem]">{t.description || 'No description'}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {t.members?.slice(0, 4).map((m) => (
                          <Avatar key={m.userId} className="w-7 h-7 ring-2 ring-white"><AvatarImage src={m.avatar} /><AvatarFallback className="text-[10px]">{m.name?.[0]}</AvatarFallback></Avatar>
                        ))}
                      </div>
                      {mine ? (
                        <Button size="sm" onClick={() => router.push(`/?team=${t.id}`)} className="gradient-button text-white border-0 text-xs">Open</Button>
                      ) : (
                        <Button size="sm" onClick={() => joinTeam(t.id)} disabled={joiningId === t.id} variant="outline" className="bg-neutral-100 border-neutral-200 text-xs">
                          {joiningId === t.id ? 'Sending...' : 'Request to join'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg glass-strong border-neutral-200">
          <CreateTeamForHackathon hackathonId={id} hackathonName={h.name} onCreated={(t) => { setCreateOpen(false); router.push(`/?team=${t.id || t._id}`); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
