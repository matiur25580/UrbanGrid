import { registerSchema, loginSchema } from "./auth.schemas.js";
import { registerAccount, loginAccount, rotateRefreshSession, revokeRefreshSession, revokeAllSessions, listSessions } from "./auth.service.js";
import { REFRESH_COOKIE_NAME, setRefreshCookie, clearRefreshCookie } from "./auth.cookies.js";

function validationError(res, parsed) {
  return res.status(400).json({
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Please check the supplied information.",
      details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))
    }
  });
}

function sendSession(res, result, status = 200) {
  setRefreshCookie(res, result.refreshToken, result.expiresAt);
  return res.status(status).json({
    success: true,
    data: {
      user: result.user,
      organization: result.organization,
      membership: result.membership,
      accessToken: result.accessToken
    }
  });
}

export async function register(req, res, next) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);
  try {
    const result = await registerAccount(parsed.data, req);
    return sendSession(res, result, 201);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false, error: { code: "ACCOUNT_OR_ORGANIZATION_EXISTS", message: "An account or organization with those details already exists." }
      });
    }
    return next(error);
  }
}

export async function login(req, res, next) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);
  try {
    const result = await loginAccount(parsed.data, req);
    if (!result) {
      return res.status(401).json({
        success: false, error: { code: "INVALID_CREDENTIALS", message: "Email, password, or organization is incorrect." }
      });
    }
    return sendSession(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const result = await rotateRefreshSession(req.cookies?.[REFRESH_COOKIE_NAME], req);
    if (!result) {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false, error: { code: "REFRESH_SESSION_INVALID", message: "Your session has expired. Please sign in again." }
      });
    }
    return sendSession(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    await revokeRefreshSession(req.cookies?.[REFRESH_COOKIE_NAME]);
    clearRefreshCookie(res);
    return res.status(200).json({ success: true, data: { message: "Session signed out." } });
  } catch (error) {
    return next(error);
  }
}

export async function logoutAll(req, res, next) {
  try {
    const revokedSessions = await revokeAllSessions(req.auth.userId);
    clearRefreshCookie(res);
    return res.status(200).json({ success: true, data: { revokedSessions } });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res) {
  return res.status(200).json({
    success: true,
    data: {
      userId: req.auth.userId,
      organization: req.auth.organization,
      membership: { id: req.auth.membershipId, role: req.auth.role }
    }
  });
}

export async function sessions(req, res, next) {
  try {
    const items = await listSessions(req.auth.userId);
    return res.status(200).json({
      success: true,
      data: { sessions: items.map((item) => ({
        id: String(item._id),
        organizationId: String(item.organizationId),
        userAgent: item.userAgent,
        ipAddress: item.ipAddress,
        createdAt: item.createdAt,
        lastUsedAt: item.lastUsedAt,
        expiresAt: item.expiresAt
      })) }
    });
  } catch (error) {
    return next(error);
  }
}
