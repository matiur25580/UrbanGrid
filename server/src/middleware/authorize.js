import { getRolePermissions } from "../modules/organizations/organization.service.js";

export function authorize(permission) {
  return async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        success: false, error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication is required." }
      });
    }

    try {
      const permissions = await getRolePermissions(req.auth.organizationId, req.auth.role);
      if (!permissions.includes("*") && !permissions.includes(permission)) {
        return res.status(403).json({
          success: false, error: { code: "PERMISSION_DENIED", message: "You do not have permission to perform this action." }
        });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
