export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly response?: any,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }

  /**
   * Creates a user-friendly error message based on the error type
   * @returns A descriptive error message with actionable guidance
   */
  getUserFriendlyMessage(): string {
    if (this.status === 401) {
      return 'Authentication failed. Please run "gh auth login" to authenticate with GitHub.';
    }
    
    if (this.status === 403) {
      if (this.code === 'rate_limit_exceeded') {
        return 'GitHub API rate limit exceeded. Please wait a few minutes before trying again.';
      }
      if (this.code === 'insufficient_scope') {
        return 'Insufficient permissions. Please re-authenticate with "gh auth login" and ensure you have codespace access.';
      }
      return 'Access forbidden. You may not have permission to access this resource.';
    }
    
    if (this.status === 404) {
      return 'Resource not found. The codespace or repository may not exist or you may not have access to it.';
    }
    
    if (this.status === 422) {
      return 'Invalid request. Please check your input parameters and try again.';
    }
    
    if (this.status === 429) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    
    if (this.status && this.status >= 500) {
      return 'GitHub API is experiencing issues. Please try again later.';
    }
    
    // Network or other errors
    if (this.message.includes('ENOTFOUND') || this.message.includes('network')) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }
    
    if (this.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    return this.message;
  }

  /**
   * Determines if the error is recoverable (can be retried)
   * @returns True if the operation can be retried
   */
  isRetryable(): boolean {
    // Temporary server errors
    if (this.status && this.status >= 500) {
      return true;
    }
    
    // Rate limiting
    if (this.status === 429) {
      return true;
    }
    
    // Network errors
    if (this.message.includes('timeout') || this.message.includes('ENOTFOUND')) {
      return true;
    }
    
    return false;
  }

  /**
   * Gets the suggested retry delay in milliseconds
   * @returns Delay in milliseconds, or null if not retryable
   */
  getRetryDelay(): number | null {
    if (!this.isRetryable()) {
      return null;
    }
    
    // Rate limit has specific retry-after header
    if (this.status === 429 && this.response?.headers?.['retry-after']) {
      return parseInt(this.response.headers['retry-after']) * 1000;
    }
    
    // Default exponential backoff
    if (this.status === 429) {
      return 60000; // 1 minute
    }
    
    if (this.status && this.status >= 500) {
      return 5000; // 5 seconds
    }
    
    return 3000; // 3 seconds for network errors
  }
}

/**
 * Creates a GitHubApiError from an Octokit error
 * @param error The original error from Octokit
 * @param context Additional context about the operation
 * @returns A standardized GitHubApiError
 */
export function createGitHubApiError(error: any, context?: string): GitHubApiError {
  const baseMessage = context ? `${context}: ` : '';
  
  // Handle Octokit RequestError
  if (error.status && error.response) {
    const status = error.status;
    const code = error.response?.data?.code || error.code;
    const message = error.response?.data?.message || error.message;
    const requestId = error.response?.headers?.['x-github-request-id'];
    
    return new GitHubApiError(
      `${baseMessage}${message}`,
      status,
      code,
      error.response,
      requestId
    );
  }
  
  // Handle network/timeout errors
  if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return new GitHubApiError(
      `${baseMessage}Network error: ${error.message}`,
      undefined,
      error.code
    );
  }
  
  // Handle generic errors
  return new GitHubApiError(
    `${baseMessage}${error.message || 'Unknown error'}`,
    error.status,
    error.code
  );
}

/**
 * Error handler middleware for GitHub API operations
 * @param operation Function that makes the GitHub API call
 * @param context Description of the operation for error messages
 * @param maxRetries Maximum number of retry attempts
 * @returns Promise that resolves to the operation result
 */
export async function withGitHubApiErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries = 3
): Promise<T> {
  let lastError: GitHubApiError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = createGitHubApiError(error, context);
      
      // Don't retry if not recoverable or on last attempt
      if (!lastError.isRetryable() || attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = lastError.getRetryDelay() || 3000;
      console.warn(`${context} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, lastError.getUserFriendlyMessage());
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}