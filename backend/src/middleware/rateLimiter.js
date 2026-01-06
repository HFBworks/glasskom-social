import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Rate limiter for message sending
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 messages per minute
  message: 'Too many messages sent, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for reactions
export const reactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 reactions per minute
  message: 'Too many reactions, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for read operations
export const readLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 read requests per minute
  message: 'Too many requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  apiLimiter,
  authLimiter,
  messageLimiter,
  reactionLimiter,
  readLimiter
};
