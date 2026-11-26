import bcrypt from "bcrypt";
import { User } from "../../models/User.js";
import { Organization } from "../../models/Organization.js";
import { Membership } from "../../models/Membership.js";
import { RefreshSession } from "../../models/RefreshSession.js";
import { createRefreshToken, hashRefreshToken, signAccessToken } from "./auth.tokens.js";

const PASSWORD_COST = 12;
const REFRESH_SESSION_DAYS = 30;
const DUMMY_PASSWORD_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

function sessionExpiry() {
  return new Date(Date.now() + REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000);
}

function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email };
}

async function issueSession({ user, organization, membership, req }) {
  const refreshToken = createRefreshToken();
  const expiresAt = sessionExpiry();
  const session = await RefreshSession.create({
    userId: user._id,
    organizationId: organization._id,
    membershipId: membership._id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt,
    userAgent: (req.get("user-agent") || "").slice(0, 500),
    ipAddress: (req.ip || "").slice(0, 64)
  });

  return {
    accessToken: signAccessToken({
      userId: user._id,
      organizationId: organization._id,
      membershipId: membership._id
    }),
    refreshToken,
    expiresAt,
    sessionId: String(session._id)
  };
}

export async function registerAccount(input, req) {
  const passwordHash = await bcrypt.hash(input.password, PASSWORD_COST);
  let user;
  let organization;
  let membership;

  try {
    user = await User.create({ name: input.name, email: input.email, passwordHash });
    organization = await Organization.create({
      name: input.organizationName,
      slug: input.organizationSlug,
      createdBy: user._id
    });
    membership = await Membership.create({
      organizationId: organization._id,
      userId: user._id,
      role: "organization_owner",
      status: "active"
    });
    const session = await issueSession({ user, organization, membership, req });
    return {
      user: publicUser(user),
      organization: { id: String(organization._id), name: organization.name, slug: organization.slug },
      membership: { id: String(membership._id), role: membership.role },
      ...session
    };
  } catch (error) {
    if (membership) await Membership.deleteOne({ _id: membership._id });
    if (organization) await Organization.deleteOne({ _id: organization._id });
    if (user) await User.deleteOne({ _id: user._id });
    throw error;
  }
}

export async function loginAccount(input, req) {
  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  if (!user || user.status !== "active") {
    await bcrypt.compare(input.password, DUMMY_PASSWORD_HASH);
    return null;
  }

  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) return null;

  const organization = await Organization.findOne({ slug: input.organizationSlug, status: "active" });
  if (!organization) return null;

  const membership = await Membership.findOne({
    userId: user._id, organizationId: organization._id, status: "active"
  });
  if (!membership) return null;

  const session = await issueSession({ user, organization, membership, req });
  return {
    user: publicUser(user),
    organization: { id: String(organization._id), name: organization.name, slug: organization.slug },
    membership: { id: String(membership._id), role: membership.role },
    ...session
  };
}

export async function rotateRefreshSession(token, req) {
  if (!token) return null;

  const now = new Date();
  const tokenHash = hashRefreshToken(token);
  const oldSession = await RefreshSession.findOneAndUpdate({
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: now }
  }, { $set: { revokedAt: now, lastUsedAt: now } }, { new: false });

  if (!oldSession) {
    const previouslyUsed = await RefreshSession.findOne({ tokenHash }).select("+tokenHash");
    if (previouslyUsed?.revokedAt) {
      // Reuse of a rotated token is treated as possible theft: revoke the user's active refresh sessions.
      await revokeAllSessions(previouslyUsed.userId);
    }
    return null;
  }

  const [user, organization, membership] = await Promise.all([
    User.findOne({ _id: oldSession.userId, status: "active" }),
    Organization.findOne({ _id: oldSession.organizationId, status: "active" }),
    Membership.findOne({ _id: oldSession.membershipId, status: "active" })
  ]);

  if (!user || !organization || !membership || String(membership.userId) !== String(user._id)
      || String(membership.organizationId) !== String(organization._id)) {
    return null;
  }

  const session = await issueSession({ user, organization, membership, req });
  await RefreshSession.updateOne({ _id: oldSession._id }, {
    $set: { replacedBySessionId: session.sessionId }
  });

  return {
    user: publicUser(user),
    organization: { id: String(organization._id), name: organization.name, slug: organization.slug },
    membership: { id: String(membership._id), role: membership.role },
    ...session
  };
}

export async function revokeRefreshSession(token) {
  if (!token) return false;
  const result = await RefreshSession.updateOne({
    tokenHash: hashRefreshToken(token), revokedAt: null
  }, { $set: { revokedAt: new Date() } });
  return result.modifiedCount === 1;
}

export async function revokeAllSessions(userId) {
  const result = await RefreshSession.updateMany({ userId, revokedAt: null }, {
    $set: { revokedAt: new Date() }
  });
  return result.modifiedCount;
}

export async function listSessions(userId) {
  return RefreshSession.find({
    userId, revokedAt: null, expiresAt: { $gt: new Date() }
  }).select("_id organizationId userAgent ipAddress createdAt lastUsedAt expiresAt")
    .sort({ lastUsedAt: -1 }).lean();
}

export async function revokeSessionById(userId, sessionId) {
  const result = await RefreshSession.updateOne({
    _id: sessionId, userId, revokedAt: null
  }, { $set: { revokedAt: new Date() } });
  return result.modifiedCount === 1;
}
