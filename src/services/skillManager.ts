import fs from 'node:fs';
import path from 'node:path';
import { SkillInfo } from '../types/skill';
import { parseFrontmatter } from '../utils/frontmatter';
import { getLocalOmxFilePath, getOmxFilePath } from '../utils/omxPaths';
import { registerTool } from './toolExecutor';

const USER_SKILLS_DIR = getOmxFilePath('skills');
const LOCAL_SKILLS_DIR = getLocalOmxFilePath('skills');

function loadSkillsFromDir(dir: string): SkillInfo[] {
  if (!fs.existsSync(dir)) return [];

  const skills: SkillInfo[] = [];
  const entries = fs.readdirSync(dir, {withFileTypes: true});

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(dir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    const content = fs.readFileSync(skillFile, 'utf-8');
    const {data} = parseFrontmatter(content);
    if (data.name && data.description) {
      skills.push({name: data.name, description: data.description, location: skillFile});
    }
  }

  return skills;
}

function loadSkills(): SkillInfo[] {
  const userSkills = loadSkillsFromDir(USER_SKILLS_DIR);
  const localSkills = loadSkillsFromDir(LOCAL_SKILLS_DIR);

  const seen = new Set<string>();
  const result: SkillInfo[] = [];

  for (const skill of localSkills) {
    if (!seen.has(skill.name)) {
      seen.add(skill.name);
      result.push(skill);
    }
  }
  for (const skill of userSkills) {
    if (!seen.has(skill.name)) {
      seen.add(skill.name);
      result.push(skill);
    }
  }

  return result;
}

let cachedSkills: SkillInfo[] | null = null;

export function getSkills(): SkillInfo[] {
  if (!cachedSkills) {
    cachedSkills = loadSkills();
  }
  return cachedSkills;
}

export function getSkill(name: string): SkillInfo | undefined {
  return getSkills().find(s => s.name === name);
}

export function registerSkillTool(): void {
  registerTool({
    name: 'skill',
    builtin: true,
    description: 'Load a skill from <available_skills> to get detailed instructions.',
    parameters: {
      properties: {skill: {type: 'string', description: 'The skill name'}},
      required: ['skill'],
    },
    formatCall: (args: Record<string, unknown>) => String(args.skill),
  }, async args => {
    const skillName = args.skill as string;
    const skill = getSkill(skillName);

    if (!skill) {
      const available = getSkills().map(s => s.name).join(', ');
      return {
        result: `Skill "${skillName}" not found. Available: ${available || 'none'}`,
        displayText: `Skill not found: ${skillName}`,
      };
    }

    const content = fs.readFileSync(skill.location, 'utf-8');
    const {content: body} = parseFrontmatter(content);
    const dir = path.dirname(skill.location);

    const output = [`## Skill: ${skill.name}`, '', `**Base directory**: ${dir}`, '', body.trim()]
      .join('\n');

    return {result: output, displayText: `Loaded skill: ${skill.name}`};
  });
}
