export interface KeyPoint {
  name: string;
  text: string;
  score: number;
}

export interface Playbook {
  version: string;
  keyPoints: KeyPoint[];
}

export interface ReflectionResult {
  newKeyPoints: string[];
  evaluations: Array<{name: string; rating: 'helpful' | 'harmful' | 'neutral';}>;
}
