import { SkillInfo } from '../types/skill';
import skillsTemplate from './skills.txt';

export function buildSkillsPrompt(skills: SkillInfo[]): string {
  if (skills.length === 0) return '';

  const skillsList = skills.map(s => `- ${s.name}: ${s.description}`).join('\n');
  return skillsTemplate.replace('{{AVAILABLE_SKILLS}}', skillsList);
}
