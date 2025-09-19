declare module 'jaeger-client' {
  import { Tracer } from 'opentracing';

  export interface TracerConfig {
    serviceName: string;
    sampler?: {
      type: string;
      param: number;
    };
    reporter?: {
      logSpans?: boolean;
      agentHost?: string;
      agentPort?: number;
    };
  }

  export function initTracer(config: TracerConfig): Tracer;
}
