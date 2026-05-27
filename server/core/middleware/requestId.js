import { v4 as uuidv4 } from 'uuid';

// ============================================================
// REQUEST ID MIDDLEWARE
// ============================================================
// Assigns a unique request ID to every request for tracing

export const requestIdMiddleware = (req, res, next) => {
  // Use existing ID from header (for distributed tracing) or generate new
  req.id = req.headers['x-request-id'] || uuidv4();
  
  // Set response header for client-side debugging
  res.setHeader('x-request-id', req.id);
  
  next();
};

