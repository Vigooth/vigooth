export interface ServiceConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  defaultPort: number;
  portEnvVar?: string;
  urlTemplate: string;
  processPattern: RegExp;
  /** Shell commands to run before starting the service */
  shellSetup?: string;
}

export interface ServiceState {
  id: string;
  status:
    | 'unknown'
    | 'running'
    | 'stopped'
    | 'starting'
    | 'stopping'
    | 'error';
  port: number;
  url: string;
  pid?: number;
  managedByTui: boolean;
  logs: string[];
  errorMessage?: string;
  logFile?: string;
}
