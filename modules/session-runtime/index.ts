import { NativeModule, requireNativeModule } from 'expo';

// Native session runtime: owns elapsed time, cues, and background execution.
// The UI only observes it. Contract: docs/logic/architecture.md.

export type RuntimeStatus =
  'idle' | 'running' | 'paused' | 'finished' | 'ended';

export interface RuntimeState {
  status: RuntimeStatus;
  sessionKey: string | null;
  elapsedMs: number;
  totalMs: number;
  pausedBy: 'user' | 'call' | null;
  // False on iOS when no workout session could start: the screen must stay on.
  backgroundCapable: boolean;
}

export interface RuntimeSegment {
  label: string;
  durationMs: number;
}

export interface RuntimeCue {
  atMs: number;
  text: string;
}

export interface StartConfig {
  sessionKey: string;
  title: string;
  segments: RuntimeSegment[];
  cues: RuntimeCue[];
  speech: boolean;
  vibration: boolean;
}

type Events = { onStateChange(state: RuntimeState): void };

declare class SessionRuntimeModule extends NativeModule<Events> {
  prepare(): Promise<{ backgroundCapable: boolean }>;
  start(config: StartConfig): Promise<RuntimeState>;
  pause(): Promise<RuntimeState>;
  resume(): Promise<RuntimeState>;
  end(): Promise<RuntimeState>;
  reset(): Promise<RuntimeState>;
  getState(): Promise<RuntimeState>;
}

export const SessionRuntime =
  requireNativeModule<SessionRuntimeModule>('SessionRuntime');
