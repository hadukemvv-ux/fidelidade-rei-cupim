/**
 * Centralized error handling and response formatting
 * Ensures consistent API responses across all endpoints
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiStatus = 'ok' | 'error' | 'unauthorized' | 'not_found' | 'validation_error' | 'server_error';

export interface ApiErrorResponse {
  ok: false;
  error: string;
  code: ApiStatus;
  timestamp: string;
  request_id?: string;
}

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
  timestamp: string;
}

/**
 * Structured logging
 */
export function logError(endpoint: string, error: Error, context?: Record<string, any>) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    endpoint,
    error: error.message,
    stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    context,
  };
  
  console.error('[API_ERROR]', JSON.stringify(errorLog, null, 2));
  return errorLog;
}

export function logInfo(endpoint: string, message: string, data?: Record<string, any>) {
  const infoLog = {
    timestamp: new Date().toISOString(),
    endpoint,
    message,
    data,
  };
  
  console.log('[API_INFO]', JSON.stringify(infoLog, null, 2));
  return infoLog;
}

/**
 * Success response with consistent format
 */
export function successResponse<T>(data: T, statusCode = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      ok: true,
      data,
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<T>,
    { status: statusCode }
  );
}

/**
 * Error response with consistent format
 */
export function errorResponse(
  message: string,
  code: ApiStatus = 'error',
  statusCode = 400,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
      timestamp: new Date().toISOString(),
      request_id: requestId,
    } as ApiErrorResponse,
    { status: statusCode }
  );
}

/**
 * Validation error response
 */
export function validationErrorResponse(error: ZodError | string): NextResponse<ApiErrorResponse> {
  let message = 'Erro de validação';
  
  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof ZodError) {
    message = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
  }
  
  return errorResponse(message, 'validation_error', 400);
}

/**
 * Handler para erros comuns em try-catch
 */
export function handleApiError(error: unknown, endpoint: string, requestId?: string): NextResponse<ApiErrorResponse> {
  if (error instanceof SyntaxError) {
    logError(endpoint, new Error(`JSON Parse Error: ${error.message}`));
    return errorResponse('Formato JSON inválido', 'validation_error', 400, requestId);
  }

  if (error instanceof Error) {
    const isValidationError = error.message.includes('validation');
    const isNotFoundError = error.message.includes('not found') || error.message.includes('não encontrado');
    
    logError(endpoint, error, { requestId });

    if (isNotFoundError) {
      return errorResponse(error.message, 'not_found', 404, requestId);
    }
    
    if (isValidationError) {
      return errorResponse(error.message, 'validation_error', 400, requestId);
    }

    return errorResponse(error.message, 'server_error', 500, requestId);
  }

  logError(endpoint, new Error('Unknown error'), { error, requestId });
  return errorResponse('Erro interno do servidor', 'server_error', 500, requestId);
}

/**
 * Rate limiting check (simple in-memory)
 * For production, use Redis
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, maxRequests = 100, windowSeconds = 60): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetTime < now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowSeconds * 1000 });
    return true;
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return true;
  }

  return false;
}

/**
 * Get or generate request ID from headers
 */
export function getRequestId(request: Request): string {
  return (request.headers.get('x-request-id') || request.headers.get('x-correlation-id') || crypto.randomUUID()).toString();
}
