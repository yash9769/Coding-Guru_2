import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS && process.env.NODE_ENV === "production") {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

let getOidcConfig: () => Promise<any>;

// Initialize the OIDC config function based on environment
if (!process.env.REPLIT_DOMAINS || process.env.NODE_ENV === "development") {
  // For local development, use a mock config
  getOidcConfig = async () => ({
    issuer: { href: "https://replit.com/oidc" },
    authorization_endpoint: "https://replit.com/oidc/auth",
    token_endpoint: "https://replit.com/oidc/token",
    userinfo_endpoint: "https://replit.com/oidc/userinfo",
    end_session_endpoint: "https://replit.com/oidc/logout",
    jwks_uri: "https://replit.com/oidc/jwks",
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile", "offline_access"],
    claims_supported: ["sub", "email", "email_verified", "name", "picture"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["client_secret_basic"],
    code_challenge_methods_supported: ["S256"]
  });
} else {
  // For production, use the real OIDC discovery with memoization
  getOidcConfig = memoize(
    async () => {
      return await client.discovery(
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        process.env.REPL_ID!
      );
    },
    { maxAge: 3600 * 1000 }
  );
}

let sessionMiddleware: any = null;

export function getSession() {
  if (sessionMiddleware) {
    return sessionMiddleware;
  }
  
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // For local development, use a simple session configuration
  if (!process.env.DATABASE_URL || process.env.NODE_ENV === "development") {
    const sessionSecret = process.env.SESSION_SECRET || "this_is_a_very_long_and_secure_session_secret_for_development_1234567890";
    console.log('DEBUG: Using session secret:', sessionSecret.substring(0, 10) + '...');
    sessionMiddleware = session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // Allow HTTP in development
        maxAge: sessionTtl,
      }
    });
  } else {
    // For production, use PostgreSQL session store
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
    });
    sessionMiddleware = session({
      secret: process.env.SESSION_SECRET!,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: true,
        maxAge: sessionTtl,
      },
    });
  }
  
  return sessionMiddleware;
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Apply session middleware to API routes except AI endpoints
  const sessionMiddleware = getSession();
  const passportInit = passport.initialize();
  const passportSession = passport.session();
  
  // Check if we're in local development mode
  const isLocalDev = !process.env.REPLIT_DOMAINS ||
                     process.env.NODE_ENV === "development" ||
                     !process.env.REPL_ID ||
                     process.env.REPL_ID === "dummy_client_id";

  // Middleware to skip session for AI endpoints and login (and all routes in local dev)
  app.use('/api', (req, res, next) => {
    // Skip session for AI endpoints, login, and all routes in local dev
    if (req.path.startsWith('/ai/') || req.path === '/login' || isLocalDev) {
      return next();
    }
    sessionMiddleware(req, res, next);
  });

  app.use('/api', (req, res, next) => {
    // Skip passport for AI endpoints, login, and all routes in local dev
    if (req.path.startsWith('/ai/') || req.path === '/login' || isLocalDev) {
      return next();
    }
    passportInit(req, res, next);
  });

  app.use('/api', (req, res, next) => {
    // Skip passport session for AI endpoints, login, and all routes in local dev
    if (req.path.startsWith('/ai/') || req.path === '/login' || isLocalDev) {
      return next();
    }
    passportSession(req, res, next);
  });

  // Check if we're in local development mode
  console.log('REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('REPL_ID:', process.env.REPL_ID);

  console.log('isLocalDev:', isLocalDev);
  
  if (isLocalDev) {
    console.log('Using local development authentication');
    // Use local authentication for development
    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    app.get("/api/login", (req, res) => {
      // Mock authentication for local development - set user directly on session
      const mockUser = {
        claims: {
          sub: "local_user_123",
          email: "demo@example.com",
          first_name: "Demo",
          last_name: "User"
        }
      };
      // For local dev, just set the user directly without passport
      (req as any).user = mockUser;
      res.redirect("/");
    });

    app.get("/api/callback", (req, res) => {
      res.redirect("/");
    });

    app.get("/api/logout", (req, res) => {
      // For local dev, just clear the user without passport
      (req as any).user = null;
      res.redirect("/");
    });
    
    return;
  }

  // Only setup OpenID authentication if not in local development
  if (!isLocalDev) {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    for (const domain of process.env
      .REPLIT_DOMAINS!.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      if (isLocalDev) {
        res.redirect("/");
      } else {
        (async () => {
          const config = await getOidcConfig();
          res.redirect(
            client.buildEndSessionUrl(config, {
              client_id: process.env.REPL_ID!,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
            }).href
          );
        })();
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // For local development, auto-authenticate
  if (!process.env.REPLIT_DOMAINS || process.env.NODE_ENV === "development") {
    if (!req.user) {
      req.user = {
        claims: {
          sub: "local_user_123",
          email: "demo@example.com",
          first_name: "Demo",
          last_name: "User"
        }
      };
    }
    return next();
  }

  // For production, use proper authentication
  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
