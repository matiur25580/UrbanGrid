import { verifyAccessToken } from "../modules/auth/auth.tokens.js";
import { User } from "../models/User.js";
import { Membership } from "../models/Membership.js";
import { Organization } from "../models/Organization.js";

export async function authenticate(req, res, next) {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false, error: { code: "AUTHENTICATION_REQUIRED", message: "A valid access token is required." }
    });
  }

  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch {
    return res.status(401).json({
      success: false, error: { code: "INVALID_ACCESS_TOKEN", message: "The access token is invalid or expired." }
    });
  }

  try {
    const [user, membership, organization] = await Promise.all([
      User.findOne({ _id: claims.sub, status: "active" }).select("_id").lean(),
      Membership.findOne({
        _id: claims.mid,
        userId: claims.sub,
        organizationId: claims.org,
        status: "active"
      }).lean(),
      Organization.findOne({ _id: claims.org, status: "active" }).select("_id name slug").lean()
    ]);

    if (!user || !membership) {
      return res.status(401).json({
        success: false, error: { code: "SESSION_MEMBERSHIP_INACTIVE", message: "The user or organization membership is unavailable." }
      });
    }

    if (!organization) {
      return res.status(403).json({
        success: false, error: { code: "ORGANIZATION_UNAVAILABLE", message: "This organization is unavailable." }
      });
    }

    req.auth = {
      userId: String(claims.sub),
      organizationId: String(claims.org),
      membershipId: String(claims.mid),
      role: membership.role,
      organization
    };
    return next();
  } catch (error) {
    return next(error);
  }
}
