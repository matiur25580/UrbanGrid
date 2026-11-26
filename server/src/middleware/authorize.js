import { hasPermission } from "../modules/auth/permissions.js";

export function authorize(permission) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        success: false, error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication is required." }
      });
    }

    if (!hasPermission(req.auth.role, permission)) {
      return res.status(403).json({
        success: false, error: { code: "PERMISSION_DENIED", message: "You do not have permission to perform this action." }
      });
    }

    return next();
  };
}
