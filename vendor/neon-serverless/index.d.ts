export interface NeonConfig {
  fetchConnectionCache?: boolean;
}

type SqlFunction = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>;

export declare const neonConfig: NeonConfig;
export declare function neon(connectionString: string): SqlFunction;
