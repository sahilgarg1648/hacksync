import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_S = 45;
const OTP_MAX_ATTEMPTS = 5;

function generateOTP() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendOtpEmail(email, name, otp) {
  if (!resend) throw new Error('Email sending is not configured');
  await resend.emails.send({
    from: 'HackSync <onboarding@resend.dev>',
    to: email,
    subject: `${otp} is your HackSync verification code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #171717; margin: 0 0 12px;">Verify your email</h2>
        <p style="color: #525252; font-size: 14px; line-height: 1.5;">Hi ${name || 'there'}, use this code to finish signing up for HackSync:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4f46e5; margin: 24px 0;">${otp}</div>
        <p style="color: #a3a3a3; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

const DEFAULT_CMS = {
  _id: 'cms',
  heroTitleLine1: 'Find your perfect',
  heroTitleLine2: 'hackathon team',
  heroSubtitle: 'Stop hunting for teammates in chaotic Discord servers. HackSync uses an intelligent matching engine to pair you with developers whose skills, interests, and availability complete your stack.',
  heroCta: 'Start matching free',
};

const PERMISSIONS_LIST = ['Read users', 'Modify users', 'Delete users', 'Read teams', 'Delete teams', 'Read reports', 'Resolve reports', 'Manage hackathons', 'Send notifications', 'Edit settings', 'View security logs'];
const DEFAULT_ROLES = [
  { name: 'Super Admin', permissions: [...PERMISSIONS_LIST] },
  { name: 'Moderator', permissions: ['Read users', 'Modify users', 'Read teams', 'Delete teams', 'Read reports', 'Resolve reports'] },
  { name: 'Support', permissions: ['Read users', 'Read teams', 'Read reports', 'Send notifications'] },
  { name: 'Content Manager', permissions: ['Manage hackathons', 'Send notifications', 'Edit settings'] },
  { name: 'Event Manager', permissions: ['Read teams', 'Manage hackathons'] },
];

function json(body, status = 200) { return NextResponse.json(body, { status }); }
function err(message, status = 400) { return json({ error: message }, status); }
function getToken(req) {
  const h = req.headers.get('authorization') || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return null;
}
function getUserFromToken(req) {
  try {
    const token = getToken(req);
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch { return null; }
}

const EXP_LEVEL = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };

const DEFAULT_MATCH_WEIGHTS = { skillOverlap: 0.15, complementary: 0.35, interests: 0.25, availability: 0.15, experience: 0.10 };

function calculateMatch(a, b, weights = DEFAULT_MATCH_WEIGHTS) {
  const skillsA = new Set(a.skills || []);
  const skillsB = new Set(b.skills || []);
  const sharedSkills = [...skillsA].filter((s) => skillsB.has(s));
  const skillUnion = new Set([...skillsA, ...skillsB]);
  const skillOverlap = sharedSkills.length / Math.max(skillUnion.size, 1);
  const complementary = [...skillsB].filter((s) => !skillsA.has(s));
  const complementaryRatio = complementary.length / Math.max(skillsB.size, 1);
  const interestsA = new Set(a.interests || []);
  const interestsB = new Set(b.interests || []);
  const sharedInterests = [...interestsA].filter((i) => interestsB.has(i));
  const interestUnion = new Set([...interestsA, ...interestsB]);
  const interestScore = sharedInterests.length / Math.max(interestUnion.size, 1);
  const availA = new Set(a.availability || []);
  const availB = new Set(b.availability || []);
  const availOverlap = [...availA].filter((x) => availB.has(x));
  const availScore = availOverlap.length / Math.max(Math.min(availA.size, availB.size) || 1, 1);
  const expA = EXP_LEVEL[a.experience] || 2;
  const expB = EXP_LEVEL[b.experience] || 2;
  const expDiff = Math.abs(expA - expB);
  const expScore = 1 - expDiff / 3;
  const score =
    skillOverlap * weights.skillOverlap +
    complementaryRatio * weights.complementary +
    interestScore * weights.interests +
    availScore * weights.availability +
    expScore * weights.experience;
  return {
    score: Math.round(score * 100),
    breakdown: {
      sharedSkills,
      complementarySkills: complementary,
      sharedInterests,
      availabilityOverlap: availOverlap,
      experienceDiff: expDiff,
    },
  };
}

function hackathonMatch(h, userSkills) {
  const required = h.skillsRequired || [];
  if (!required.length) return null;
  const userSet = new Set(userSkills || []);
  const matchedSkills = required.filter((s) => userSet.has(s));
  const missingSkills = required.filter((s) => !userSet.has(s));
  return {
    matchScore: Math.round((matchedSkills.length / required.length) * 100),
    matchedSkills,
    missingSkills,
  };
}

let seedEnsured = false;
async function ensureSeed(db) {
  // Demo/seed data has been removed. This only guarantees the unique index exists —
  // it no longer inserts fake developers. Only needs to run once per warm instance,
  // not on every request.
  if (seedEnsured) return;
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  // auto-clean abandoned signups (OTP itself expires after 10 min; this just clears the doc)
  await db.collection('pending_registrations').createIndex({ createdAt: 1 }, { expireAfterSeconds: 1800 });
  seedEnsured = true;
}

async function getHackathonsFromDb(db) {
  const dbHackathons = await db.collection('hackathons').find({}).toArray();
  return dbHackathons.map((h) => ({ ...h, id: h._id }));
}

function adminGuard(req) {
  const u = getUserFromToken(req);
  if (!u) return { error: 'Unauthorized', status: 401 };
  return { user: u };
}

async function requireAdmin(req, db) {
  const u = getUserFromToken(req);
  if (!u) return { err: err('Unauthorized', 401) };
  const me = await db.collection('users').findOne({ _id: u.id });
  if (!me?.isAdmin) return { err: err('Admin access required', 403) };
  return { user: me };
}

// ---------- Gemini via Google AI Studio (direct) ----------
async function callGemini(prompt, { json: wantJson = false, system = '' } = {}) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      ...(wantJson ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Invalid JSON from Gemini'); }
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || '').join('');
}

// ---------- GitHub public API ----------
async function fetchGithubProfile(username) {
  const u = username.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '');
  if (!u) throw new Error('Invalid GitHub username');
  const [profileRes, reposRes] = await Promise.all([
    fetch(`https://api.github.com/users/${u}`, { headers: { 'User-Agent': 'HackSync' } }),
    fetch(`https://api.github.com/users/${u}/repos?per_page=100&sort=pushed`, { headers: { 'User-Agent': 'HackSync' } }),
  ]);
  if (!profileRes.ok) throw new Error('GitHub user not found');
  const profile = await profileRes.json();
  const repos = reposRes.ok ? await reposRes.json() : [];
  const languages = {};
  let stars = 0;
  for (const r of repos) {
    if (r.language) languages[r.language] = (languages[r.language] || 0) + 1;
    stars += r.stargazers_count || 0;
  }
  const langArr = Object.entries(languages).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return {
    username: profile.login,
    avatar: profile.avatar_url,
    name: profile.name,
    bio: profile.bio,
    followers: profile.followers,
    following: profile.following,
    publicRepos: profile.public_repos,
    stars,
    languages: langArr,
    topRepos: repos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5).map((r) => ({
      name: r.name, stars: r.stargazers_count, language: r.language, url: r.html_url, description: r.description,
    })),
  };
}

async function handle(req, { params }) {
  const segs = params?.path || [];
  const path = '/' + segs.join('/');
  const method = req.method;

  try {
    const db = await getDb();
    await ensureSeed(db);

    // ============ AUTH ============
    if (path === '/auth/register' && method === 'POST') {
      const { email, password, name } = await req.json();
      if (!email || !password || !name) return err('Missing fields');
      if (password.length < 6) return err('Password must be at least 6 characters');
      const normalizedEmail = email.toLowerCase().trim();
      const exists = await db.collection('users').findOne({ email: normalizedEmail });
      if (exists) return err('Email already registered', 409);

      const otp = generateOTP();
      const [otpHash, passwordHash] = await Promise.all([bcrypt.hash(otp, 8), bcrypt.hash(password, 8)]);
      await db.collection('pending_registrations').updateOne(
        { _id: normalizedEmail },
        { $set: {
            name, passwordHash, otpHash,
            otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
            attempts: 0, lastSentAt: new Date(), createdAt: new Date(),
          } },
        { upsert: true }
      );
      try {
        await sendOtpEmail(normalizedEmail, name, otp);
      } catch (e) {
        return err('Could not send the verification email. Please try again in a moment.', 502);
      }
      return json({ pending: true, email: normalizedEmail });
    }

    if (path === '/auth/verify-otp' && method === 'POST') {
      const { email, otp } = await req.json();
      if (!email || !otp) return err('Missing fields');
      const normalizedEmail = email.toLowerCase().trim();
      const pending = await db.collection('pending_registrations').findOne({ _id: normalizedEmail });
      if (!pending) return err('No pending signup found for this email — please sign up again.', 404);
      if (new Date(pending.otpExpiresAt) < new Date()) {
        await db.collection('pending_registrations').deleteOne({ _id: normalizedEmail });
        return err('That code expired. Please sign up again to get a new one.', 410);
      }
      if (pending.attempts >= OTP_MAX_ATTEMPTS) {
        await db.collection('pending_registrations').deleteOne({ _id: normalizedEmail });
        return err('Too many incorrect attempts. Please sign up again.', 429);
      }
      const ok = await bcrypt.compare(String(otp).trim(), pending.otpHash);
      if (!ok) {
        await db.collection('pending_registrations').updateOne({ _id: normalizedEmail }, { $inc: { attempts: 1 } });
        return err('Incorrect code', 400);
      }
      const exists = await db.collection('users').findOne({ email: normalizedEmail });
      if (exists) {
        await db.collection('pending_registrations').deleteOne({ _id: normalizedEmail });
        return err('Email already registered', 409);
      }
      const id = uuidv4();
      await db.collection('users').insertOne({
        _id: id, email: normalizedEmail, password: pending.passwordHash,
        name: pending.name, profileComplete: false, createdAt: new Date(),
      });
      await db.collection('pending_registrations').deleteOne({ _id: normalizedEmail });
      const token = jwt.sign({ id, email: normalizedEmail, name: pending.name }, JWT_SECRET, { expiresIn: '1d' });
      return json({ token, user: { id, email: normalizedEmail, name: pending.name, profileComplete: false } });
    }

    if (path === '/auth/resend-otp' && method === 'POST') {
      const { email } = await req.json();
      if (!email) return err('Missing email');
      const normalizedEmail = email.toLowerCase().trim();
      const pending = await db.collection('pending_registrations').findOne({ _id: normalizedEmail });
      if (!pending) return err('No pending signup found for this email — please sign up again.', 404);
      const secondsSinceLastSend = (Date.now() - new Date(pending.lastSentAt).getTime()) / 1000;
      if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_S) {
        return err(`Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_S - secondsSinceLastSend)}s before requesting another code`, 429);
      }
      const otp = generateOTP();
      const otpHash = await bcrypt.hash(otp, 8);
      await db.collection('pending_registrations').updateOne(
        { _id: normalizedEmail },
        { $set: { otpHash, otpExpiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0, lastSentAt: new Date() } }
      );
      try {
        await sendOtpEmail(normalizedEmail, pending.name, otp);
      } catch (e) {
        return err('Could not send the verification email. Please try again in a moment.', 502);
      }
      return json({ ok: true });
    }

    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = await req.json();
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (!user) return err('Invalid credentials', 401);
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return err('Invalid credentials', 401);
      const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
      const { password: _p, _id, ...safe } = user;
      return json({ token, user: { ...safe, id: user._id } });
    }

    if (path === '/auth/me' && method === 'GET') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const user = await db.collection('users').findOne({ _id: u.id });
      if (!user) return err('Not found', 404);
      const { password, _id, ...safe } = user;
      return json({ user: { ...safe, id: user._id } });
    }

    // ============ GOOGLE OAUTH ============
    if (path === '/auth/google' && method === 'GET') {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: `${BASE_URL}/api/auth/google/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
      });
      return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
    }

    if (path === '/auth/google/callback' && method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      if (!code) return NextResponse.redirect(`${BASE_URL}/?google_error=missing_code`);
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: `${BASE_URL}/api/auth/google/callback`,
          }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) return NextResponse.redirect(`${BASE_URL}/?google_error=token_exchange`);
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();
        const email = profile.email?.toLowerCase();
        if (!email) return NextResponse.redirect(`${BASE_URL}/?google_error=no_email`);

        let user = await db.collection('users').findOne({ email });
        if (!user) {
          const id = uuidv4();
          await db.collection('users').insertOne({
            _id: id, email, name: profile.name || email,
            avatar: profile.picture, profileComplete: false,
            googleId: profile.id, createdAt: new Date(),
          });
          user = await db.collection('users').findOne({ _id: id });
        } else if (!user.googleId) {
          await db.collection('users').updateOne({ _id: user._id }, { $set: { googleId: profile.id, avatar: user.avatar || profile.picture } });
        }
        const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
        return NextResponse.redirect(`${BASE_URL}/?token=${token}`);
      } catch (e) {
        return NextResponse.redirect(`${BASE_URL}/?google_error=${encodeURIComponent(e.message)}`);
      }
    }

    // ============ PROFILE ============
    if (path === '/profile' && method === 'PUT') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const data = await req.json();
      const sanitizeTags = (arr, maxLen = 30, maxCount = 20) => {
        if (!Array.isArray(arr)) return [];
        const seen = new Set();
        const out = [];
        for (const raw of arr) {
          if (typeof raw !== 'string') continue;
          const v = raw.trim().slice(0, maxLen);
          const key = v.toLowerCase();
          if (!v || seen.has(key)) continue;
          seen.add(key);
          out.push(v);
          if (out.length >= maxCount) break;
        }
        return out;
      };
      const update = {
        college: data.college || '',
        year: data.year || '',
        bio: data.bio || '',
        avatar: data.avatar || '',
        skills: sanitizeTags(data.skills),
        interests: sanitizeTags(data.interests),
        github: data.github || '',
        linkedin: data.linkedin || '',
        availability: sanitizeTags(data.availability),
        experience: data.experience || 'beginner',
        profileComplete: true, updatedAt: new Date(),
      };
      await db.collection('users').updateOne({ _id: u.id }, { $set: update });
      const user = await db.collection('users').findOne({ _id: u.id });
      const { password, _id, ...safe } = user;
      return json({ user: { ...safe, id: user._id } });
    }

    // ============ DEVELOPERS ============
    if (path === '/developers' && method === 'GET') {
      const url = new URL(req.url);
      const skill = url.searchParams.get('skill');
      const interest = url.searchParams.get('interest');
      const q = { profileComplete: true };
      if (skill) q.skills = skill;
      if (interest) q.interests = interest;
      const list = await db.collection('users').find(q).limit(60).toArray();
      const cleaned = list.map(({ password, _id, ...r }) => ({ ...r, id: _id }));
      return json({ developers: cleaned });
    }

    if (path.startsWith('/developers/') && method === 'GET') {
      const id = segs[1];
      const user = await db.collection('users').findOne({ _id: id });
      if (!user) return err('Not found', 404);
      const { password, _id, ...r } = user;
      return json({ developer: { ...r, id: _id } });
    }

    // ============ MATCHES ============
    if (path === '/matches' && method === 'GET') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const me = await db.collection('users').findOne({ _id: u.id });
      if (!me || !me.profileComplete) return err('Complete your profile first', 400);
      const matchCfg = await db.collection('config').findOne({ _id: 'matching' });
      if (matchCfg?.enabled === false) return err('Matching is temporarily disabled by an admin', 503);
      const weights = matchCfg ? {
        skillOverlap: matchCfg.skillOverlap ?? DEFAULT_MATCH_WEIGHTS.skillOverlap,
        complementary: matchCfg.complementary ?? DEFAULT_MATCH_WEIGHTS.complementary,
        interests: matchCfg.interests ?? DEFAULT_MATCH_WEIGHTS.interests,
        availability: matchCfg.availability ?? DEFAULT_MATCH_WEIGHTS.availability,
        experience: matchCfg.experience ?? DEFAULT_MATCH_WEIGHTS.experience,
      } : DEFAULT_MATCH_WEIGHTS;
      const others = await db.collection('users').find({ _id: { $ne: u.id }, profileComplete: true }).toArray();
      const ranked = others
        .map((o) => {
          const { password, _id, ...r } = o;
          const m = calculateMatch(me, o, weights);
          return { developer: { ...r, id: _id }, ...m };
        })
        .sort((a, b) => b.score - a.score);
      return json({ matches: ranked });
    }

    // ============ HACKATHONS + STATS ============
    if (path === '/hackathons' && method === 'GET') {
      const all = await getHackathonsFromDb(db);
      const visible = all.filter((h) => h.verified !== false);
      const u = getUserFromToken(req);
      const me = u ? await db.collection('users').findOne({ _id: u.id }) : null;
      const withExtras = visible.map((h) => ({
        ...h,
        registeredCount: (h.registeredUserIds || []).length,
        ...(me ? (hackathonMatch(h, me.skills) || {}) : {}),
      }));
      return json({ hackathons: withExtras });
    }

    if (path === '/hackathons' && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const data = await req.json();
      const REQUIRED_FIELDS = {
        name: 'Hackathon name', description: 'Description', college: 'College', banner: 'Banner image URL',
        domain: 'Domain', prize: 'Prize', deadline: 'Deadline', participants: 'Expected participants',
        location: 'Location', mode: 'Mode', teamSize: 'Team size', difficulty: 'Difficulty',
      };
      for (const [field, label] of Object.entries(REQUIRED_FIELDS)) {
        if (!String(data[field] || '').trim()) return err(`${label} is required`);
      }
      if (!Array.isArray(data.skillsRequired) || data.skillsRequired.length === 0) {
        return err('At least one required skill is needed');
      }
      const id = uuidv4();
      const h = {
        _id: id, name: data.name.trim(), banner: data.banner.trim(), domain: data.domain.trim(), prize: data.prize.trim(),
        deadline: data.deadline.trim(), participants: data.participants.trim(), tag: 'New', status: 'active',
        college: data.college.trim(), description: data.description.trim(),
        location: data.location.trim(), mode: data.mode.trim(), teamSize: data.teamSize.trim(), difficulty: data.difficulty.trim(),
        skillsRequired: data.skillsRequired, organizerLogo: String(data.organizerLogo || '').trim(),
        registeredUserIds: [],
        verified: false, submittedBy: u.id, submitterName: u.name,
        createdAt: new Date(),
      };
      await db.collection('hackathons').insertOne(h);
      return json({ hackathon: { ...h, id } });
    }

    if (path.match(/^\/hackathons\/[^/]+$/) && method === 'GET') {
      const id = segs[1];
      const h = await db.collection('hackathons').findOne({ _id: id, verified: { $ne: false } });
      if (!h) return err('Hackathon not found', 404);
      const u = getUserFromToken(req);
      const me = u ? await db.collection('users').findOne({ _id: u.id }) : null;
      const registeredIds = h.registeredUserIds || [];
      const teams = await db.collection('teams').find({ hackathonId: id }).sort({ createdAt: -1 }).toArray();
      return json({
        hackathon: {
          ...h, id: h._id, registeredCount: registeredIds.length, isRegistered: u ? registeredIds.includes(u.id) : false,
          ...(me ? (hackathonMatch(h, me.skills) || {}) : {}),
        },
        teams: teams.map((t) => ({ ...t, id: t._id })),
      });
    }

    if (path.match(/^\/hackathons\/[^/]+\/register$/) && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const id = segs[1];
      const h = await db.collection('hackathons').findOne({ _id: id, verified: { $ne: false } });
      if (!h) return err('Hackathon not found', 404);
      await db.collection('hackathons').updateOne({ _id: id }, { $addToSet: { registeredUserIds: u.id } });
      const updated = await db.collection('hackathons').findOne({ _id: id });
      return json({ ok: true, registeredCount: (updated.registeredUserIds || []).length, isRegistered: true });
    }

    if (path.match(/^\/hackathons\/[^/]+\/register$/) && method === 'DELETE') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const id = segs[1];
      await db.collection('hackathons').updateOne({ _id: id }, { $pull: { registeredUserIds: u.id } });
      const updated = await db.collection('hackathons').findOne({ _id: id });
      if (!updated) return err('Hackathon not found', 404);
      return json({ ok: true, registeredCount: (updated.registeredUserIds || []).length, isRegistered: false });
    }

    // Hackathons the current user is registered for
    if (path === '/my/hackathons' && method === 'GET') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const list = await db.collection('hackathons').find({ registeredUserIds: u.id, verified: { $ne: false } }).sort({ createdAt: -1 }).toArray();
      return json({ hackathons: list.map((h) => ({ ...h, id: h._id })) });
    }

    // Matches + teams scoped to a hackathon — only visible to users registered for it
    if (path.match(/^\/hackathons\/[^/]+\/matches$/) && method === 'GET') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const id = segs[1];
      const h = await db.collection('hackathons').findOne({ _id: id, verified: { $ne: false } });
      if (!h) return err('Hackathon not found', 404);
      const registeredIds = h.registeredUserIds || [];
      if (!registeredIds.includes(u.id)) return err('Register for this hackathon to see matches for it', 403);
      const me = await db.collection('users').findOne({ _id: u.id });
      if (!me?.profileComplete) return err('Complete your profile first', 400);
      const matchCfg = await db.collection('config').findOne({ _id: 'matching' });
      const weights = matchCfg ? {
        skillOverlap: matchCfg.skillOverlap ?? DEFAULT_MATCH_WEIGHTS.skillOverlap,
        complementary: matchCfg.complementary ?? DEFAULT_MATCH_WEIGHTS.complementary,
        interests: matchCfg.interests ?? DEFAULT_MATCH_WEIGHTS.interests,
        availability: matchCfg.availability ?? DEFAULT_MATCH_WEIGHTS.availability,
        experience: matchCfg.experience ?? DEFAULT_MATCH_WEIGHTS.experience,
      } : DEFAULT_MATCH_WEIGHTS;
      const otherIds = registeredIds.filter((rid) => rid !== u.id);
      const others = await db.collection('users').find({ _id: { $in: otherIds }, profileComplete: true }).toArray();
      const ranked = others
        .map((o) => {
          const { password, _id, ...r } = o;
          const m = calculateMatch(me, o, weights);
          return { developer: { ...r, id: _id }, ...m };
        })
        .sort((a, b) => b.score - a.score);
      const teams = await db.collection('teams').find({ hackathonId: id }).sort({ createdAt: -1 }).toArray();
      return json({
        hackathon: { ...h, id: h._id, registeredCount: registeredIds.length },
        matches: ranked,
        teams: teams.map((t) => ({ ...t, id: t._id })),
      });
    }
    if (path === '/cms' && method === 'GET') {
      const cfg = await db.collection('config').findOne({ _id: 'cms' });
      return json({ cms: { ...DEFAULT_CMS, ...cfg } });
    }
    if (path === '/stats' && method === 'GET') {
      const [devCount, hackathonCount, teamCount] = await Promise.all([
        db.collection('users').countDocuments({ profileComplete: true }),
        db.collection('hackathons').countDocuments({ verified: { $ne: false } }),
        db.collection('teams').countDocuments({}),
      ]);
      return json({ developers: devCount, hackathons: hackathonCount, teams: teamCount });
    }

    // ============ TEAMS ============
    if (path === '/teams' && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const { name, description, hackathonId, rolesNeeded } = await req.json();
      if (!name) return err('Team name is required');
      if (hackathonId) {
        const h = await db.collection('hackathons').findOne({ _id: hackathonId });
        if (!h) return err('Hackathon not found', 404);
        if (!(h.registeredUserIds || []).includes(u.id)) return err('Register for this hackathon before creating a team for it', 403);
      }
      const me = await db.collection('users').findOne({ _id: u.id });
      const id = uuidv4();
      const team = {
        _id: id, name, description: description || '',
        hackathonId: hackathonId || null,
        rolesNeeded: Array.isArray(rolesNeeded) ? rolesNeeded : [],
        ownerId: u.id,
        members: [{ userId: u.id, name: me.name, avatar: me.avatar, role: 'Founder', joinedAt: new Date() }],
        joinRequests: [],
        createdAt: new Date(),
      };
      await db.collection('teams').insertOne(team);
      // welcome message
      await db.collection('messages').insertOne({
        _id: uuidv4(), teamId: id, userId: 'system', userName: 'HackSync',
        userAvatar: '', content: `🚀 Team "${name}" was created! Welcome aboard.`,
        system: true, createdAt: new Date(),
      });
      return json({ team });
    }

    if (path === '/teams' && method === 'GET') {
      const u = getUserFromToken(req);
      const url = new URL(req.url);
      const mine = url.searchParams.get('mine');
      let q = {};
      if (mine === 'true' && u) q = { 'members.userId': u.id };
      const teams = await db.collection('teams').find(q).sort({ createdAt: -1 }).limit(60).toArray();
      const out = teams.map((t) => ({ ...t, id: t._id }));
      return json({ teams: out });
    }

    if (path.startsWith('/teams/') && segs.length === 2 && method === 'GET') {
      const team = await db.collection('teams').findOne({ _id: segs[1] });
      if (!team) return err('Team not found', 404);
      return json({ team: { ...team, id: team._id } });
    }

    if (path.match(/^\/teams\/[^/]+\/join$/) && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const teamId = segs[1];
      const { message: msg } = await req.json().catch(() => ({}));
      const team = await db.collection('teams').findOne({ _id: teamId });
      if (!team) return err('Team not found', 404);
      if (team.members.find((m) => m.userId === u.id)) return err('Already a member', 400);
      if (team.joinRequests.find((r) => r.userId === u.id && r.status === 'pending')) return err('Request already pending', 400);
      if (team.hackathonId) {
        const h = await db.collection('hackathons').findOne({ _id: team.hackathonId });
        if (h && !(h.registeredUserIds || []).includes(u.id)) return err('Register for this hackathon before requesting to join a team for it', 403);
      }
      const me = await db.collection('users').findOne({ _id: u.id });
      await db.collection('teams').updateOne({ _id: teamId }, {
        $push: { joinRequests: { userId: u.id, name: me.name, avatar: me.avatar, message: msg || '', status: 'pending', createdAt: new Date() } },
      });
      return json({ ok: true });
    }

    if (path.match(/^\/teams\/[^/]+\/join\/[^/]+$/) && method === 'PUT') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const teamId = segs[1];
      const requestUserId = segs[3];
      const { action } = await req.json(); // 'approve' | 'reject'
      const team = await db.collection('teams').findOne({ _id: teamId });
      if (!team) return err('Team not found', 404);
      if (team.ownerId !== u.id) return err('Only owner can manage requests', 403);
      const reqIdx = team.joinRequests.findIndex((r) => r.userId === requestUserId && r.status === 'pending');
      if (reqIdx === -1) return err('Request not found', 404);
      if (action === 'approve') {
        const requester = await db.collection('users').findOne({ _id: requestUserId });
        await db.collection('teams').updateOne({ _id: teamId }, {
          $push: { members: { userId: requestUserId, name: requester.name, avatar: requester.avatar, role: 'Member', joinedAt: new Date() } },
          $set: { [`joinRequests.${reqIdx}.status`]: 'approved' },
        });
        await db.collection('messages').insertOne({
          _id: uuidv4(), teamId, userId: 'system', userName: 'HackSync', userAvatar: '',
          content: `🎉 ${requester.name} joined the team!`, system: true, createdAt: new Date(),
        });
      } else {
        await db.collection('teams').updateOne({ _id: teamId }, { $set: { [`joinRequests.${reqIdx}.status`]: 'rejected' } });
      }
      return json({ ok: true });
    }

    // Owner directly adds a member (no request needed)
    if (path.match(/^\/teams\/[^/]+\/members$/) && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const teamId = segs[1];
      const { userId, role } = await req.json();
      if (!userId) return err('userId required');
      const team = await db.collection('teams').findOne({ _id: teamId });
      if (!team) return err('Team not found', 404);
      if (team.ownerId !== u.id) return err('Only owner can add members', 403);
      if (team.members.find((m) => m.userId === userId)) return err('Already a member', 400);
      const newUser = await db.collection('users').findOne({ _id: userId });
      if (!newUser) return err('User not found', 404);
      await db.collection('teams').updateOne({ _id: teamId }, {
        $push: { members: { userId, name: newUser.name, avatar: newUser.avatar, role: role || 'Member', joinedAt: new Date() } },
      });
      await db.collection('messages').insertOne({
        _id: uuidv4(), teamId, userId: 'system', userName: 'HackSync', userAvatar: '',
        content: `✨ ${newUser.name} was added to the team!`, system: true, createdAt: new Date(),
      });
      // resolve any pending request from this user
      const reqIdx = (team.joinRequests || []).findIndex((r) => r.userId === userId && r.status === 'pending');
      if (reqIdx !== -1) {
        await db.collection('teams').updateOne({ _id: teamId }, { $set: { [`joinRequests.${reqIdx}.status`]: 'approved' } });
      }
      return json({ ok: true });
    }

    // Owner removes a member
    if (path.match(/^\/teams\/[^/]+\/members\/[^/]+$/) && method === 'DELETE') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const teamId = segs[1];
      const memberId = segs[3];
      const team = await db.collection('teams').findOne({ _id: teamId });
      if (!team) return err('Team not found', 404);
      if (team.ownerId !== u.id) return err('Only owner can remove members', 403);
      if (memberId === team.ownerId) return err('Cannot remove the owner', 400);
      const removed = team.members.find((m) => m.userId === memberId);
      if (!removed) return err('Member not found', 404);
      await db.collection('teams').updateOne({ _id: teamId }, { $pull: { members: { userId: memberId } } });
      await db.collection('messages').insertOne({
        _id: uuidv4(), teamId, userId: 'system', userName: 'HackSync', userAvatar: '',
        content: `${removed.name} was removed from the team.`, system: true, createdAt: new Date(),
      });
      return json({ ok: true });
    }

    // ============ MESSAGES (polling-based real-time) ============
    if (path.match(/^\/teams\/[^/]+\/messages$/) && method === 'GET') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const teamId = segs[1];
      const team = await db.collection('teams').findOne({ _id: teamId });
      if (!team) return err('Team not found', 404);
      if (!team.members.find((m) => m.userId === u.id)) return err('Not a team member', 403);
      const url = new URL(req.url);
      const since = url.searchParams.get('since');
      const q = { teamId };
      if (since) q.createdAt = { $gt: new Date(since) };
      const messages = await db.collection('messages').find(q).sort({ createdAt: 1 }).limit(200).toArray();
      // typing indicators
      const typing = await db.collection('typing').find({ teamId, until: { $gt: new Date() }, userId: { $ne: u.id } }).toArray();
      return json({ messages: messages.map((m) => ({ ...m, id: m._id })), typing: typing.map((t) => ({ userId: t.userId, name: t.name })) });
    }

    if (path.match(/^\/teams\/[^/]+\/messages$/) && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const teamId = segs[1];
      const { content } = await req.json();
      if (!content?.trim()) return err('Empty message');
      const team = await db.collection('teams').findOne({ _id: teamId });
      if (!team) return err('Team not found', 404);
      if (!team.members.find((m) => m.userId === u.id)) return err('Not a team member', 403);
      const me = await db.collection('users').findOne({ _id: u.id });
      const message = {
        _id: uuidv4(), teamId, userId: u.id, userName: me.name, userAvatar: me.avatar || '',
        content: content.trim(), createdAt: new Date(),
      };
      await db.collection('messages').insertOne(message);
      // clear typing
      await db.collection('typing').deleteOne({ teamId, userId: u.id });
      return json({ message: { ...message, id: message._id } });
    }

    if (path.match(/^\/teams\/[^/]+\/typing$/) && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const teamId = segs[1];
      const me = await db.collection('users').findOne({ _id: u.id });
      await db.collection('typing').updateOne(
        { teamId, userId: u.id },
        { $set: { teamId, userId: u.id, name: me.name, until: new Date(Date.now() + 4000) } },
        { upsert: true }
      );
      return json({ ok: true });
    }

    // ============ AI (Gemini) ============
    if (path === '/ai/project-ideas' && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const { teamId, theme } = await req.json();
      const team = await db.collection('teams').findOne({ _id: teamId });
      if (!team) return err('Team not found', 404);
      const memberIds = team.members.map((m) => m.userId);
      const members = await db.collection('users').find({ _id: { $in: memberIds } }).toArray();
      const skills = [...new Set(members.flatMap((m) => m.skills || []))];
      const interests = [...new Set(members.flatMap((m) => m.interests || []))];
      const prompt = `You are an expert hackathon mentor. Suggest 4 ambitious yet achievable hackathon project ideas for a team with these combined skills: ${skills.join(', ') || 'general'} and shared interests: ${interests.join(', ') || 'tech'}.${theme ? ` The hackathon theme is: ${theme}.` : ''} Return strict JSON: {"ideas":[{"title":string,"tagline":string,"description":string,"techStack":string[],"keyFeatures":string[],"impact":string}]}`;
      const text = await callGemini(prompt, { json: true, system: 'You are a hackathon mentor that responds only with valid JSON.' });
      let parsed;
      try { parsed = JSON.parse(text); } catch { return err('AI returned invalid JSON', 500); }
      return json(parsed);
    }

    if (path === '/ai/team-roles' && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const { teamId } = await req.json();
      const team = await db.collection('teams').findOne({ _id: teamId });
      if (!team) return err('Team not found', 404);
      const memberIds = team.members.map((m) => m.userId);
      const members = await db.collection('users').find({ _id: { $in: memberIds } }).toArray();
      const lines = members.map((m) => `- ${m.name}: skills=[${(m.skills||[]).join(', ')}], experience=${m.experience}`).join('\n');
      const prompt = `Analyze this hackathon team and suggest specific roles for each member based on their strengths. Return strict JSON: {"assignments":[{"name":string,"role":string,"reason":string}],"summary":string}\n\nTeam:\n${lines}`;
      const text = await callGemini(prompt, { json: true, system: 'You are a hackathon team coach. Respond with strict JSON only.' });
      let parsed;
      try { parsed = JSON.parse(text); } catch { return err('AI returned invalid JSON', 500); }
      return json(parsed);
    }

    if (path === '/ai/team-balance' && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const { teamId } = await req.json();
      const team = await db.collection('teams').findOne({ _id: teamId });
      if (!team) return err('Team not found', 404);
      const memberIds = team.members.map((m) => m.userId);
      const members = await db.collection('users').find({ _id: { $in: memberIds } }).toArray();
      const lines = members.map((m) => `- ${m.name}: skills=[${(m.skills||[]).join(', ')}], interests=[${(m.interests||[]).join(', ')}], xp=${m.experience}`).join('\n');
      const prompt = `Analyze the balance of this hackathon team. Identify strengths, gaps, and recommend 2-3 ideal next hires (skill profiles). Return strict JSON: {"strengths":string[],"gaps":string[],"recommendations":[{"profile":string,"why":string}],"score":number}\n\nTeam:\n${lines}`;
      const text = await callGemini(prompt, { json: true, system: 'You are an analytical hackathon team strategist. Respond with strict JSON only.' });
      let parsed;
      try { parsed = JSON.parse(text); } catch { return err('AI returned invalid JSON', 500); }
      return json(parsed);
    }

    // ============ GITHUB ============
    if (path.startsWith('/github/') && method === 'GET') {
      const username = segs[1];
      try {
        const data = await fetchGithubProfile(username);
        return json(data);
      } catch (e) { return err(e.message, 404); }
    }

    if (path === '/' || path === '') {
      return json({ ok: true, service: 'HackSync API' });
    }

    // ============ DIRECT MESSAGES ============
    if (path === '/conversations' && method === 'GET') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const msgs = await db.collection('dm_messages').find({ $or: [{ fromUserId: u.id }, { toUserId: u.id }] }).sort({ createdAt: -1 }).toArray();
      const latestByConv = new Map();
      const unreadByConv = new Map();
      for (const m of msgs) {
        if (!latestByConv.has(m.conversationId)) latestByConv.set(m.conversationId, m);
        if (m.toUserId === u.id && !m.read) unreadByConv.set(m.conversationId, (unreadByConv.get(m.conversationId) || 0) + 1);
      }
      const otherIds = [...latestByConv.values()].map((m) => (m.fromUserId === u.id ? m.toUserId : m.fromUserId));
      const others = await db.collection('users').find({ _id: { $in: otherIds } }).toArray();
      const otherMap = new Map(others.map((o) => [o._id, o]));
      const conversations = [...latestByConv.entries()].map(([convId, last]) => {
        const otherId = last.fromUserId === u.id ? last.toUserId : last.fromUserId;
        const other = otherMap.get(otherId);
        return {
          conversationId: convId,
          otherUser: other ? { id: other._id, name: other.name, avatar: other.avatar } : { id: otherId, name: 'Unknown user' },
          lastMessage: last.content,
          lastMessageAt: last.createdAt,
          lastMessageFromMe: last.fromUserId === u.id,
          unread: unreadByConv.get(convId) || 0,
        };
      }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      return json({ conversations, totalUnread: conversations.reduce((s, c) => s + c.unread, 0) });
    }

    if (path.match(/^\/messages\/[^/]+$/) && method === 'GET') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const otherId = segs[1];
      const other = await db.collection('users').findOne({ _id: otherId });
      if (!other) return err('User not found', 404);
      const conversationId = [u.id, otherId].sort().join('::');
      const url = new URL(req.url);
      const since = url.searchParams.get('since');
      const q = { conversationId };
      if (since) q.createdAt = { $gt: new Date(since) };
      const messages = await db.collection('dm_messages').find(q).sort({ createdAt: 1 }).limit(200).toArray();
      await db.collection('dm_messages').updateMany({ conversationId, toUserId: u.id, read: { $ne: true } }, { $set: { read: true } });
      return json({
        messages: messages.map((m) => ({ ...m, id: m._id })),
        otherUser: { id: other._id, name: other.name, avatar: other.avatar },
      });
    }

    if (path.match(/^\/messages\/[^/]+$/) && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const otherId = segs[1];
      if (otherId === u.id) return err('Cannot message yourself');
      const other = await db.collection('users').findOne({ _id: otherId });
      if (!other) return err('User not found', 404);
      const { content } = await req.json();
      if (!content?.trim()) return err('Empty message');
      const me = await db.collection('users').findOne({ _id: u.id });
      const conversationId = [u.id, otherId].sort().join('::');
      const message = {
        _id: uuidv4(), conversationId, fromUserId: u.id, fromUserName: me.name, fromUserAvatar: me.avatar || '',
        toUserId: otherId, content: content.trim(), read: false, createdAt: new Date(),
      };
      await db.collection('dm_messages').insertOne(message);
      return json({ message: { ...message, id: message._id } });
    }

    // ============ NOTIFICATIONS (user inbox) ============
    if (path === '/notifications' && method === 'GET') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const me = await db.collection('users').findOne({ _id: u.id });
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const monthAgo = new Date(Date.now() - 30 * 86400000);
      const matchesAudience = (n) => {
        if (n.audience === 'verified') return !!me?.verified;
        if (n.audience === 'active') return me?.updatedAt && new Date(me.updatedAt) >= weekAgo;
        if (n.audience === 'new') return me?.createdAt && new Date(me.createdAt) >= monthAgo;
        return true;
      };
      const all = await db.collection('notifications').find({}).sort({ createdAt: -1 }).limit(30).toArray();
      const relevant = all
        .filter((n) => !me?.createdAt || new Date(n.createdAt) >= new Date(me.createdAt))
        .filter(matchesAudience)
        .map((n) => ({ ...n, id: n._id, read: (n.readBy || []).includes(u.id) }));
      return json({ notifications: relevant, unreadCount: relevant.filter((n) => !n.read).length });
    }

    if (path === '/notifications/read-all' && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      await db.collection('notifications').updateMany({}, { $addToSet: { readBy: u.id } });
      return json({ ok: true });
    }

    if (path.match(/^\/notifications\/[^/]+\/read$/) && method === 'POST') {
      const u = getUserFromToken(req);
      if (!u) return err('Unauthorized', 401);
      const id = segs[1];
      await db.collection('notifications').updateOne({ _id: id }, { $addToSet: { readBy: u.id } });
      return json({ ok: true });
    }

    // ============ ADMIN ============
    if (path === '/admin/me' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      return json({ user: { id: r.user._id, name: r.user.name, email: r.user.email, isAdmin: true } });
    }

    if (path === '/admin/overview' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const now = Date.now();
      const dayAgo = new Date(now - 86400000);
      const weekAgo = new Date(now - 7 * 86400000);
      const monthAgo = new Date(now - 30 * 86400000);
      const fourteenDaysAgo = new Date(now - 14 * 86400000);
      const [
        totalUsers, activeToday, usersThisMonth, usersPrevMonth, teamsCount, messagesCount,
        hackathonsCount, pendingReportsCount, pendingVerificationsCount, teamsWithRequests,
        allUsers, growthAgg, recentUsers, recentMessages, recentTeams,
      ] = await Promise.all([
        db.collection('users').countDocuments({}),
        db.collection('users').countDocuments({ updatedAt: { $gte: dayAgo } }),
        db.collection('users').countDocuments({ createdAt: { $gte: monthAgo } }),
        db.collection('users').countDocuments({ createdAt: { $gte: new Date(now - 60 * 86400000), $lt: monthAgo } }),
        db.collection('teams').countDocuments({}),
        db.collection('messages').countDocuments({}),
        db.collection('hackathons').countDocuments({ verified: { $ne: false } }),
        db.collection('reports').countDocuments({ status: 'pending' }),
        db.collection('users').countDocuments({ verified: { $ne: true }, profileComplete: true }),
        db.collection('teams').find({}, { projection: { joinRequests: 1 } }).toArray(),
        db.collection('users').find({ profileComplete: true }, { projection: { skills: 1, college: 1, createdAt: 1 } }).toArray(),
        db.collection('users').aggregate([
          { $match: { createdAt: { $gte: fourteenDaysAgo } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        ]).toArray(),
        db.collection('users').find({}).sort({ createdAt: -1 }).limit(8).toArray(),
        db.collection('messages').find({ system: { $ne: true } }).sort({ createdAt: -1 }).limit(5).toArray(),
        db.collection('teams').find({}).sort({ createdAt: -1 }).limit(3).toArray(),
      ]);
      const applicationsCount = teamsWithRequests.reduce((s, t) => s + (t.joinRequests || []).length, 0);
      // skill popularity
      const skillCounts = {}; const collegeCounts = {};
      for (const u of allUsers) {
        for (const s of u.skills || []) skillCounts[s] = (skillCounts[s] || 0) + 1;
        if (u.college) collegeCounts[u.college] = (collegeCounts[u.college] || 0) + 1;
      }
      // last 14d growth
      const growthMap = Object.fromEntries(growthAgg.map((g) => [g._id, g.count]));
      const growth = [];
      for (let i = 13; i >= 0; i--) {
        const d1 = new Date(now - i * 86400000);
        growth.push({ day: d1.toISOString().slice(5, 10), users: growthMap[d1.toISOString().slice(0, 10)] || 0 });
      }
      const recent = recentUsers.map((u) => ({ id: u._id, name: u.name, email: u.email, avatar: u.avatar, college: u.college, createdAt: u.createdAt }));
      // recent activity (synthetic from messages + teams + users)
      const activity = [];
      for (const m of recentMessages) activity.push({ type: 'message', text: `${m.userName} sent a message`, at: m.createdAt });
      for (const t of recentTeams) activity.push({ type: 'team', text: `Team "${t.name}" was created`, at: t.createdAt });
      activity.sort((a, b) => new Date(b.at) - new Date(a.at));

      const growthPct = usersPrevMonth ? Math.round(((usersThisMonth - usersPrevMonth) / usersPrevMonth) * 100) : 100;
      return json({
        totalUsers, activeToday, teams: teamsCount, messages: messagesCount,
        hackathons: hackathonsCount,
        pendingReports: pendingReportsCount,
        pendingVerifications: pendingVerificationsCount,
        applications: applicationsCount,
        growthPct,
        growth,
        topSkills: Object.entries(skillCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
        topColleges: Object.entries(collegeCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6),
        recentRegistrations: recent,
        recentActivity: activity.slice(0, 10),
      });
    }

    if (path === '/admin/users' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const url = new URL(req.url);
      const search = url.searchParams.get('q');
      const status = url.searchParams.get('status');
      const verified = url.searchParams.get('verified');
      const q = {};
      if (search) q.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { college: { $regex: search, $options: 'i' } }];
      if (status) q.status = status;
      if (verified === 'true') q.verified = true;
      if (verified === 'false') q.verified = { $ne: true };
      const users = await db.collection('users').find(q).sort({ createdAt: -1 }).limit(200).toArray();
      const cleaned = users.map(({ password, _id, ...rest }) => ({ ...rest, id: _id }));
      return json({ users: cleaned });
    }

    if (path.match(/^\/admin\/users\/[^/]+$/) && method === 'PATCH') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const id = segs[2];
      const updates = await req.json();
      const allow = ['verified', 'status', 'isAdmin', 'role', 'reports'];
      const set = {};
      for (const k of allow) if (k in updates) set[k] = updates[k];
      if (!Object.keys(set).length) return err('No valid fields');
      await db.collection('users').updateOne({ _id: id }, { $set: set });
      await db.collection('audit_logs').insertOne({ _id: uuidv4(), actorId: r.user._id, action: 'user.update', target: id, payload: set, at: new Date() });
      return json({ ok: true });
    }

    if (path.match(/^\/admin\/users\/[^/]+$/) && method === 'DELETE') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const id = segs[2];
      if (id === r.user._id) return err('Cannot delete yourself', 400);
      await db.collection('users').deleteOne({ _id: id });
      await db.collection('audit_logs').insertOne({ _id: uuidv4(), actorId: r.user._id, action: 'user.delete', target: id, at: new Date() });
      return json({ ok: true });
    }

    if (path === '/admin/teams' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const teams = await db.collection('teams').find({}).sort({ createdAt: -1 }).toArray();
      return json({ teams: teams.map((t) => ({ ...t, id: t._id })) });
    }

    if (path.match(/^\/admin\/teams\/[^/]+$/) && method === 'DELETE') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const id = segs[2];
      await db.collection('teams').deleteOne({ _id: id });
      await db.collection('messages').deleteMany({ teamId: id });
      await db.collection('audit_logs').insertOne({ _id: uuidv4(), actorId: r.user._id, action: 'team.delete', target: id, at: new Date() });
      return json({ ok: true });
    }

    if (path.match(/^\/admin\/teams\/[^/]+$/) && method === 'PATCH') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const id = segs[2];
      const updates = await req.json();
      const allow = ['featured', 'locked', 'name', 'description'];
      const set = {};
      for (const k of allow) if (k in updates) set[k] = updates[k];
      await db.collection('teams').updateOne({ _id: id }, { $set: set });
      await db.collection('audit_logs').insertOne({ _id: uuidv4(), actorId: r.user._id, action: 'team.update', target: id, payload: set, at: new Date() });
      return json({ ok: true });
    }

    // Hackathons admin (move to DB if not already there; fall back to seed)
    if (path === '/admin/hackathons' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      return json({ hackathons: await getHackathonsFromDb(db) });
    }

    if (path === '/admin/hackathons' && method === 'POST') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const data = await req.json();
      const id = uuidv4();
      const h = {
        _id: id, name: data.name, banner: data.banner || '', domain: data.domain || '', prize: data.prize || '',
        deadline: data.deadline || '', participants: data.participants || '0', tag: data.tag || 'New', status: data.status || 'active',
        college: data.college || '', description: data.description || '',
        location: data.location || '', mode: data.mode || 'online', teamSize: data.teamSize || '', difficulty: data.difficulty || 'all-levels',
        skillsRequired: Array.isArray(data.skillsRequired) ? data.skillsRequired : [], organizerLogo: data.organizerLogo || '',
        registeredUserIds: [],
        verified: true, submittedBy: null, submitterName: null,
        createdAt: new Date(),
      };
      await db.collection('hackathons').insertOne(h);
      return json({ hackathon: { ...h, id } });
    }

    if (path.match(/^\/admin\/hackathons\/[^/]+$/) && method === 'PATCH') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const id = segs[2];
      const data = await req.json();
      await db.collection('hackathons').updateOne({ _id: id }, { $set: data });
      if ('verified' in data) {
        await db.collection('audit_logs').insertOne({ _id: uuidv4(), actorId: r.user._id, action: data.verified ? 'hackathon.approve' : 'hackathon.unverify', target: id, at: new Date() });
      }
      return json({ ok: true });
    }

    if (path.match(/^\/admin\/hackathons\/[^/]+$/) && method === 'DELETE') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const id = segs[2];
      await db.collection('hackathons').deleteOne({ _id: id });
      await db.collection('audit_logs').insertOne({ _id: uuidv4(), actorId: r.user._id, action: 'hackathon.delete', target: id, at: new Date() });
      return json({ ok: true });
    }

    // Reports (synthesized + stored)
    if (path === '/admin/reports' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const reports = await db.collection('reports').find({}).sort({ createdAt: -1 }).toArray();
      return json({ reports: reports.map((r) => ({ ...r, id: r._id })) });
    }

    if (path.match(/^\/admin\/reports\/[^/]+$/) && method === 'PATCH') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const id = segs[2];
      const { status, action } = await req.json();
      await db.collection('reports').updateOne({ _id: id }, { $set: { status: status || 'resolved', resolvedAt: new Date(), action } });
      return json({ ok: true });
    }

    // Verifications (synthesized — not yet a full system)
    if (path === '/admin/verifications' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const unverified = await db.collection('users').find({ verified: { $ne: true }, profileComplete: true }).limit(20).toArray();
      const verifications = unverified.map((u) => {
        // Credibility signal derived from real profile completeness, not a random number.
        const signals = [!!u.github, !!u.linkedin, !!u.bio, (u.skills || []).length >= 2, (u.availability || []).length >= 1];
        const credibilityScore = Math.round((signals.filter(Boolean).length / signals.length) * 100);
        return {
          id: u._id, userId: u._id, userName: u.name, userAvatar: u.avatar, userEmail: u.email,
          type: u.github ? 'github' : (u.linkedin ? 'linkedin' : 'college_email'),
          evidence: u.github || u.linkedin || u.email,
          status: 'pending', credibilityScore,
          submittedAt: u.createdAt,
        };
      });
      return json({ verifications });
    }

    if (path === '/admin/matching-config' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const cfg = await db.collection('config').findOne({ _id: 'matching' });
      return json({ config: cfg || { _id: 'matching', skillOverlap: 0.15, complementary: 0.35, interests: 0.25, availability: 0.15, experience: 0.10, enabled: true } });
    }

    if (path === '/admin/matching-config' && method === 'PUT') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const cfg = await req.json();
      await db.collection('config').updateOne({ _id: 'matching' }, { $set: cfg }, { upsert: true });
      return json({ ok: true });
    }

    if (path === '/admin/analytics' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const now = Date.now();
      const fourteenDaysAgo = new Date(now - 14 * 86400000);
      const [
        totalUsers, dauAgg, msgAgg, allUsers, completed, teams, totalMessages,
      ] = await Promise.all([
        db.collection('users').countDocuments({}),
        db.collection('users').aggregate([
          { $match: { updatedAt: { $gte: fourteenDaysAgo } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, count: { $sum: 1 } } },
        ]).toArray(),
        db.collection('messages').aggregate([
          { $match: { createdAt: { $gte: fourteenDaysAgo } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        ]).toArray(),
        db.collection('users').find({ profileComplete: true }, { projection: { skills: 1, college: 1 } }).toArray(),
        db.collection('users').countDocuments({ profileComplete: true }),
        db.collection('teams').find({}, { projection: { members: 1 } }).toArray(),
        db.collection('messages').countDocuments({}),
      ]);
      // 14-day DAU (real counts — active = profile updated that day, messages = real message count)
      const dauMap = Object.fromEntries(dauAgg.map((g) => [g._id, g.count]));
      const msgMap = Object.fromEntries(msgAgg.map((g) => [g._id, g.count]));
      const dau = [];
      for (let i = 13; i >= 0; i--) {
        const d1 = new Date(now - i * 86400000);
        const key = d1.toISOString().slice(0, 10);
        dau.push({ day: d1.toISOString().slice(5, 10), dau: dauMap[key] || 0, messages: msgMap[key] || 0 });
      }
      // technologies
      const techCounts = {};
      for (const u of allUsers) for (const s of u.skills || []) techCounts[s] = (techCounts[s] || 0) + 1;
      const technologies = Object.entries(techCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
      const collegeCounts = {};
      for (const u of allUsers) if (u.college) collegeCounts[u.college] = (collegeCounts[u.college] || 0) + 1;
      const colleges = Object.entries(collegeCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
      // funnel — only stages we actually track. No pageview/analytics tracking exists, so
      // "visited" and no project-submission feature exists, so that stage isn't included either.
      const inTeamIds = new Set();
      for (const t of teams) for (const m of t.members || []) inTeamIds.add(m.userId);
      const funnel = [
        { stage: 'Signed up', count: totalUsers },
        { stage: 'Profile complete', count: completed },
        { stage: 'In a team', count: inTeamIds.size },
      ];
      return json({
        dau, technologies, colleges, funnel,
        totalMessages,
        profileCompletionRate: totalUsers ? Math.round((completed / totalUsers) * 100) : 0,
        teamFormationRate: totalUsers ? Math.round((inTeamIds.size / totalUsers) * 100) : 0,
        collegesRepresented: colleges.length,
      });
    }

    if (path === '/admin/audit' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const logs = await db.collection('audit_logs').find({}).sort({ at: -1 }).limit(50).toArray();
      return json({ logs: logs.map((l) => ({ ...l, id: l._id })) });
    }

    if (path === '/admin/notifications' && method === 'POST') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const { title, body, audience } = await req.json();
      const id = uuidv4();
      await db.collection('notifications').insertOne({ _id: id, title, body, audience: audience || 'all', sentBy: r.user._id, createdAt: new Date() });
      await db.collection('audit_logs').insertOne({ _id: uuidv4(), actorId: r.user._id, action: 'notification.broadcast', payload: { title, audience }, at: new Date() });
      return json({ ok: true, id });
    }

    if (path === '/admin/notifications' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const list = await db.collection('notifications').find({}).sort({ createdAt: -1 }).limit(50).toArray();
      return json({ notifications: list.map((n) => ({ ...n, id: n._id })) });
    }

    if (path === '/admin/security' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      // No login/session event logging is implemented yet, so there's nothing real to show.
      // Returning an honest empty state instead of fabricated events.
      return json({
        events: [],
        summary: { totalLogins24h: 0, failedAttempts: 0, suspiciousIps: 0, activeSessions: 0 },
        tracked: false,
      });
    }

    if (path === '/admin/settings' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const cfg = await db.collection('config').findOne({ _id: 'platform' });
      return json({ settings: cfg || { _id: 'platform', maintenance: false, signupsOpen: true, googleOAuth: true, aiEnabled: true, brandName: 'HackSync', primaryColor: '#a855f7' } });
    }

    if (path === '/admin/settings' && method === 'PUT') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const data = await req.json();
      await db.collection('config').updateOne({ _id: 'platform' }, { $set: data }, { upsert: true });
      return json({ ok: true });
    }

    // ============ CMS ============
    if (path === '/admin/cms' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const cfg = await db.collection('config').findOne({ _id: 'cms' });
      return json({ cms: { ...DEFAULT_CMS, ...cfg } });
    }

    if (path === '/admin/cms' && method === 'PUT') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const data = await req.json();
      const { heroTitleLine1, heroTitleLine2, heroSubtitle, heroCta } = data;
      await db.collection('config').updateOne({ _id: 'cms' }, { $set: { heroTitleLine1, heroTitleLine2, heroSubtitle, heroCta } }, { upsert: true });
      await db.collection('audit_logs').insertOne({ _id: uuidv4(), actorId: r.user._id, action: 'cms.update', at: new Date() });
      return json({ ok: true });
    }

    // ============ RBAC ============
    if (path === '/admin/roles' && method === 'GET') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const cfg = await db.collection('config').findOne({ _id: 'roles' });
      return json({ roles: cfg?.roles || DEFAULT_ROLES, permissions: PERMISSIONS_LIST });
    }

    if (path === '/admin/roles' && method === 'PUT') {
      const r = await requireAdmin(req, db); if (r.err) return r.err;
      const { roles } = await req.json();
      if (!Array.isArray(roles)) return err('roles must be an array');
      const cleaned = roles.map((role) => ({
        name: String(role.name || '').slice(0, 60),
        permissions: Array.isArray(role.permissions) ? role.permissions.filter((p) => PERMISSIONS_LIST.includes(p)) : [],
      })).filter((role) => role.name);
      await db.collection('config').updateOne({ _id: 'roles' }, { $set: { roles: cleaned } }, { upsert: true });
      await db.collection('audit_logs').insertOne({ _id: uuidv4(), actorId: r.user._id, action: 'roles.update', at: new Date() });
      return json({ ok: true, roles: cleaned });
    }

    return err(`Not found: ${method} ${path}`, 404);
  } catch (e) {
    console.error('API error', e);
    return err(e.message || 'Server error', 500);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
