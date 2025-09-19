import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';

const logger = createLogger('circuit-breaker');

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: string[];
  onStateChange?: (state: CircuitBreakerState, error?: Error) => void;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  timeoutCount: number;
  rejectedCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttempt?: Date;
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly state: CircuitBreakerState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private timeoutCount = 0;
  private rejectedCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttempt?: Date;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = config;
    
    logger.info('Circuit breaker created', {
      name: config.name,
      failureThreshold: config.failureThreshold,
      resetTimeout: config.resetTimeout,
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.emit('stateChange', this.state);
        logger.info('Circuit breaker state changed to HALF_OPEN', { name: this.config.name });
      } else {
        this.rejectedCount++;
        const error = new CircuitBreakerError(
          `Circuit breaker is OPEN for ${this.config.name}`,
          this.state
        );
        logger.warn('Request rejected - circuit breaker is OPEN', {
          name: this.config.name,
          rejectedCount: this.rejectedCount,
        });
        throw error;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Execute with timeout protection
   */
  async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return this.execute(async () => {
      return Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            this.timeoutCount++;
            reject(new Error(`Operation timed out after ${timeout}ms`));
          }, timeout);
        })
      ]);
    });
  }

  /**
   * Check if we should attempt to reset the circuit breaker
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttempt) {
      this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
    }
    return Date.now() >= this.nextAttempt.getTime();
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      this.nextAttempt = undefined;
      this.emit('stateChange', this.state);
      logger.info('Circuit breaker reset to CLOSED', {
        name: this.config.name,
        successCount: this.successCount,
      });
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    // Check if this is an expected error that shouldn't trigger the circuit breaker
    if (this.isExpectedError(error)) {
      logger.debug('Expected error ignored by circuit breaker', {
        name: this.config.name,
        error: error.message,
      });
      return;
    }

    logger.warn('Circuit breaker failure recorded', {
      name: this.config.name,
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      error: error.message,
    });

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
      this.emit('stateChange', this.state, error);
      
      logger.error('Circuit breaker tripped to OPEN', {
        name: this.config.name,
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
        resetTimeout: this.config.resetTimeout,
      });

      if (this.config.onStateChange) {
        this.config.onStateChange(this.state, error);
      }
    }
  }

  /**
   * Check if an error is expected and shouldn't trigger the circuit breaker
   */
  private isExpectedError(error: Error): boolean {
    if (!this.config.expectedErrors) {
      return false;
    }

    return this.config.expectedErrors.some(expectedError => 
      error.message.includes(expectedError) || 
      error.constructor.name === expectedError
    );
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      name: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      timeoutCount: this.timeoutCount,
      rejectedCount: this.rejectedCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttempt: this.nextAttempt,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.nextAttempt = undefined;
    this.emit('stateChange', this.state);
    
    logger.info('Circuit breaker manually reset', { name: this.config.name });
  }

  /**
   * Manually trip the circuit breaker
   */
  trip(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
    this.emit('stateChange', this.state);
    
    logger.warn('Circuit breaker manually tripped', { name: this.config.name });
  }
}

/**
 * Circuit Breaker Manager for handling multiple circuit breakers
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Create or get a circuit breaker
   */
  getOrCreate(config: CircuitBreakerConfig): CircuitBreaker {
    if (this.breakers.has(config.name)) {
      return this.breakers.get(config.name)!;
    }

    const breaker = new CircuitBreaker(config);
    this.breakers.set(config.name, breaker);
    return breaker;
  }

  /**
   * Get a circuit breaker by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): CircuitBreakerStats[] {
    return Array.from(this.breakers.values()).map(breaker => breaker.getStats());
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
    logger.info('All circuit breakers reset');
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();
