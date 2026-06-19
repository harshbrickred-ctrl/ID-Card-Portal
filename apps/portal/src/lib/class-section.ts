export type ClassSectionParts = {
  class: string;
  section: string;
};

export function formatClassSection(className: string, section: string): string {
  return `${className.trim()}-${section.trim()}`;
}

export function parseClassSection(raw: string): ClassSectionParts | null {
  const value = raw.trim();
  if (!value) return null;

  const split = value.split(/[\s\-/]+/).filter(Boolean);
  if (split.length >= 2) {
    return { class: split[0], section: split.slice(1).join("-") };
  }

  const match = value.match(/^(\d+)([A-Za-z]+)$/);
  if (match) {
    return { class: match[1], section: match[2].toUpperCase() };
  }

  return null;
}
