export interface NeonConfig {
  fetchConnectionCache?: boolean;
}

type SqlFunction = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>;

export declare const neonConfig: NeonConfig;
export declare function neon(connectionString: string): SqlFunction;
export declare class Pool {
  constructor(options: { connectionString: string });
  query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
  connect(): Promise<{ query: Pool['query']; release(): void }>;
}
