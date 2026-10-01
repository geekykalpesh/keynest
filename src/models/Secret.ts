export interface SecretField {
  name: string;
  value: string;
  isSensitive: boolean;
}

export interface Secret {
  id: string;
  name: string;
  type: string;
  description?: string;
  projectId?: string;
  environment?: string;
  tags: string[];
  fields: SecretField[];
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
}
