import { Secret } from './Secret';
import { Project } from './Project';
import { Environment } from './Environment';

export interface VaultMetadata {
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vault {
  secrets: Record<string, Secret>;
  projects: Record<string, Project>;
  environments: Record<string, Environment>;
  metadata: VaultMetadata;
}
