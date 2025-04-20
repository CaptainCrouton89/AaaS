import { NextFunction, Request, Response } from "express";

/**
 * Middleware to extract user information from request
 * This will be used to set owner fields for database records
 *
 * For now, this accepts a user ID in the header or sets a default value
 * In a production environment, this would be replaced with proper authentication
 */
export const userContext = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // In production, this would come from a JWT token or session
  // For now, we'll use a header or default value
  const userId = (req.headers["x-user-id"] as string) || "system";

  // Add user info to request object
  req.user = { id: userId };

  next();
};

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}
