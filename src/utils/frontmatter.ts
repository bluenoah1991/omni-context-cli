import matter from 'gray-matter';

export function parseFrontmatter(content: string): {data: any; content: string;} {
  try {
    const result = matter(content);
    return {data: result.data, content: result.content};
  } catch {
    return {data: {}, content};
  }
}
