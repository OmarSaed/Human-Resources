import { initTracer } from 'jaeger-client';
import { Tracer, Span, SpanContext, FORMAT_HTTP_HEADERS } from 'opentracing';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';

const logger = createLogger('tracer');

export interface TracingConfig {
  serviceName: string;
  jaegerEndpoint?: string;
  sampler?: {
    type: string;
    param: number;
  };
  reporter?: {
    logSpans: boolean;
    agentHost?: string;
    agentPort?: number;
  };
}

export class TracingService {
  private tracer: Tracer;
  private serviceName: string;

  constructor(config: TracingConfig) {
    this.serviceName = config.serviceName;
    
    const tracerConfig = {
      serviceName: config.serviceName,
      sampler: config.sampler || {
        type: 'const',
        param: 1, // Sample all traces in development
      },
      reporter: config.reporter || {
        logSpans: false,
        agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
        agentPort: parseInt(process.env.JAEGER_AGENT_PORT || '6832'),
      },
    };

    this.tracer = initTracer(tracerConfig);
    
    logger.info('Distributed tracing initialized', {
      serviceName: this.serviceName,
      agentHost: tracerConfig.reporter.agentHost,
      agentPort: tracerConfig.reporter.agentPort,
    });
  }

  /**
   * Get the tracer instance
   */
  getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Start a new span
   */
  startSpan(operationName: string, parentSpan?: Span | SpanContext): Span {
    const spanOptions: any = {};
    
    if (parentSpan) {
      if (parentSpan instanceof Span) {
        spanOptions.childOf = parentSpan;
      } else {
        spanOptions.childOf = parentSpan;
      }
    }

    const span = this.tracer.startSpan(operationName, spanOptions);
    
    // Add common tags
    span.setTag('service.name', this.serviceName);
    span.setTag('service.version', process.env.SERVICE_VERSION || '1.0.0');
    
    return span;
  }

  /**
   * Extract span context from HTTP headers
   */
  extractSpanContext(headers: Record<string, any>): SpanContext | null {
    try {
      return this.tracer.extract(FORMAT_HTTP_HEADERS, headers) as SpanContext;
    } catch (error) {
      logger.warn('Failed to extract span context', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Inject span context into HTTP headers
   */
  injectSpanContext(span: Span, headers: Record<string, any>): void {
    try {
      this.tracer.inject(span, FORMAT_HTTP_HEADERS, headers);
    } catch (error) {
      logger.warn('Failed to inject span context', { error: (error as Error).message });
    }
  }

  /**
   * Create middleware for Express to automatically trace HTTP requests
   */
  createExpressMiddleware() {
    return (req: any, res: any, next: any) => {
      const parentSpanContext = this.extractSpanContext(req.headers);
      const span = this.startSpan(`HTTP ${req.method} ${req.path}`, parentSpanContext || undefined);
      
      // Add HTTP-specific tags
      span.setTag('http.method', req.method);
      span.setTag('http.url', req.url);
      span.setTag('http.user_agent', req.get('User-Agent') || 'unknown');
      span.setTag('user.id', req.user?.id || 'anonymous');
      
      // Generate correlation ID if not present
      const correlationId = req.headers['x-correlation-id'] || uuidv4();
      req.correlationId = correlationId;
      span.setTag('correlation.id', correlationId);
      
      // Attach span to request
      req.span = span;
      
      // Override res.json to add response tags
      const originalJson = res.json;
      res.json = function(body: any) {
        span.setTag('http.status_code', res.statusCode);
        
        if (res.statusCode >= 400) {
          span.setTag('error', true);
          span.setTag('error.message', body.message || 'Unknown error');
        }
        
        span.finish();
        return originalJson.call(this, body);
      };

      // Handle response end
      res.on('finish', () => {
        try {
          span.setTag('http.status_code', res.statusCode);
          if (res.statusCode >= 400) {
            span.setTag('error', true);
          }
          span.finish();
        } catch (error) {
          // Span might already be finished
        }
      });

      // Handle errors
      res.on('error', (error: Error) => {
        span.setTag('error', true);
        span.setTag('error.message', error.message);
        span.log({ error: error.stack });
        span.finish();
      });

      next();
    };
  }

  /**
   * Trace a function execution
   */
  async traceFunction<T>(
    operationName: string,
    fn: (span: Span) => Promise<T>,
    parentSpan?: Span | SpanContext
  ): Promise<T> {
    const span = this.startSpan(operationName, parentSpan);
    
    try {
      const result = await fn(span);
      span.setTag('success', true);
      return result;
    } catch (error) {
      span.setTag('error', true);
      span.setTag('error.message', (error as Error).message);
      span.log({ error: (error as Error).stack });
      throw error;
    } finally {
      span.finish();
    }
  }

  /**
   * Close the tracer
   */
  close(): void {
    logger.info('Distributed tracing closed');
  }
}

// Singleton instance
let tracingInstance: TracingService | null = null;

export function initializeTracing(config: TracingConfig): TracingService {
  if (tracingInstance) {
    logger.warn('Tracing already initialized');
    return tracingInstance;
  }
  
  tracingInstance = new TracingService(config);
  return tracingInstance;
}

export function getTracer(): TracingService {
  if (!tracingInstance) {
    throw new Error('Tracing not initialized. Call initializeTracing() first.');
  }
  return tracingInstance;
}

export { Span, SpanContext } from 'opentracing';
