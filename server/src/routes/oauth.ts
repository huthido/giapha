import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { signJWT } from '../middleware/auth';
import {
  CLIENT_ORIGIN, SERVER_BASE,
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
  FACEBOOK_APP_ID, FACEBOOK_APP_SECRET,
} from '../config';

// ── Shared: find-or-create user from OAuth profile ────────────────────────────

function findOrCreate(opts: {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string | null;
  name: string;
  avatar: string | null;
}): any {
  const { provider, providerId, email, name, avatar } = opts;
  const idCol = provider === 'google' ? 'google_id' : 'facebook_id';

  // 1. Find by provider id
  let user = db.prepare(`SELECT * FROM users WHERE ${idCol} = ?`).get(providerId) as any;
  if (user) return user;

  // 2. Find by email and link
  if (email) {
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (user) {
      db.prepare(`UPDATE users SET ${idCol} = ?, oauth_avatar = COALESCE(oauth_avatar, ?) WHERE id = ?`)
        .run(providerId, avatar, user.id);
      return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }
  }

  // 3. Create new managed user
  const id     = uuidv4();
  const nodeId = uuidv4();
  const userEmail = email ?? `${provider}_${providerId}@oauth.internal`;
  const userCount = (db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }).n;
  const role = userCount === 0 ? 'admin' : 'member';

  db.prepare(
    `INSERT INTO users (id, name, email, password, role, avatar, oauth_avatar, ${idCol})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, userEmail, `__oauth_${provider}__`, role, avatar, avatar, providerId);
  db.prepare('INSERT INTO family_nodes (id, user_id, generation, pos_x, pos_y) VALUES (?, ?, 0, 0, 0)')
    .run(nodeId, id);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// ── Passport strategies ───────────────────────────────────────────────────────

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${SERVER_BASE}/api/auth/google/callback`,
    },
    (_at, _rt, profile, done) => {
      try {
        const user = findOrCreate({
          provider: 'google',
          providerId: profile.id,
          email: profile.emails?.[0]?.value ?? null,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value ?? null,
        });
        done(null, user);
      } catch (e) { done(e as Error); }
    }
  ));
}

if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy(
    {
      clientID: FACEBOOK_APP_ID,
      clientSecret: FACEBOOK_APP_SECRET,
      callbackURL: `${SERVER_BASE}/api/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'photos', 'email'],
    },
    (_at, _rt, profile, done) => {
      try {
        const user = findOrCreate({
          provider: 'facebook',
          providerId: profile.id,
          email: profile.emails?.[0]?.value ?? null,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value ?? null,
        });
        done(null, user);
      } catch (e) { done(e as Error); }
    }
  ));
}

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser((id: string, done) =>
  done(null, db.prepare('SELECT * FROM users WHERE id = ?').get(id) || false)
);

// ── Helper: redirect to client with JWT ──────────────────────────────────────

function oauthSuccess(req: Request, res: Response) {
  const user = req.user as any;
  if (!user) return res.redirect(`${CLIENT_ORIGIN}/login?error=oauth_failed`);
  const token = signJWT(user.id);
  res.redirect(`${CLIENT_ORIGIN}/auth/callback?token=${encodeURIComponent(token)}`);
}

function oauthFail(_req: Request, res: Response) {
  res.redirect(`${CLIENT_ORIGIN}/login?error=oauth_failed`);
}

const notConfigured = (name: string) =>
  (_req: Request, res: Response) =>
    res.status(503).json({ error: `${name} OAuth chưa được cấu hình` });

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// Google
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );
  router.get('/google/callback',
    (req, res, next) =>
      passport.authenticate('google', { failureRedirect: `${CLIENT_ORIGIN}/login?error=oauth_failed` })(req, res, next),
    oauthSuccess
  );
} else {
  router.get('/google', notConfigured('Google'));
  router.get('/google/callback', notConfigured('Google'));
}

// Facebook
if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
  router.get('/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
  );
  router.get('/facebook/callback',
    (req, res, next) =>
      passport.authenticate('facebook', { failureRedirect: `${CLIENT_ORIGIN}/login?error=oauth_failed` })(req, res, next),
    oauthSuccess
  );
} else {
  router.get('/facebook', notConfigured('Facebook'));
  router.get('/facebook/callback', notConfigured('Facebook'));
}

export { passport };
export default router;
