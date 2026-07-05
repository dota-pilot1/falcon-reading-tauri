export type Agent = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  level?: string;
  sessionGoal?: string;
  skills?: string[];
  starterPrompts?: string[];
  systemPrompt?: string;
};
