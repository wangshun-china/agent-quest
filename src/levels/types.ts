import { LazyExoticComponent } from 'react'

export interface Reference {
  title: string;
  url: string;
  source: string;
}

export interface LevelConfig {
  id: string;
  zone: number;
  order: number;
  title: string;
  description: string;
  type: 'concept' | 'config' | 'decision' | 'debug';
  component: LazyExoticComponent<() => JSX.Element>;
  requiresLevels: string[];
  references: Reference[];
  tracePath?: string;
}