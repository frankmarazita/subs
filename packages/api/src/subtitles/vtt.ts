import type { SubtitleCueDto } from '@subs/contracts';

const TIMING_LINE =
  /^((?:\d+:)?\d{2}:\d{2}\.\d{3})\s+-->\s+((?:\d+:)?\d{2}:\d{2}\.\d{3})/;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function parseTimestamp(raw: string): number {
  const parts = raw.split(':').map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return String.fromCodePoint(parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith('#')) {
      return String.fromCodePoint(parseInt(entity.slice(1), 10));
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function cleanLine(line: string): string {
  return decodeEntities(line.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

interface RawCue {
  start: number;
  end: number;
  lines: string[];
}

function parseRawCues(vtt: string): RawCue[] {
  const blocks = vtt.replace(/\r\n?/g, '\n').split(/\n{2,}/);
  const cues: RawCue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    const timingIndex = lines.findIndex((line) => TIMING_LINE.test(line));
    if (timingIndex === -1) continue;

    const match = TIMING_LINE.exec(lines[timingIndex]);
    if (!match) continue;

    cues.push({
      start: parseTimestamp(match[1]),
      end: parseTimestamp(match[2]),
      lines: lines
        .slice(timingIndex + 1)
        .map(cleanLine)
        .filter((line) => line.length > 0),
    });
  }

  return cues;
}

export function parseVtt(vtt: string): SubtitleCueDto[] {
  return parseRawCues(vtt)
    .filter((cue) => cue.lines.length > 0)
    .map((cue) => ({
      start: cue.start,
      end: cue.end,
      text: cue.lines.join('\n'),
    }));
}

/**
 * YouTube auto-generated captions are "rolling": each cue repeats the
 * previous line before adding a new one, with near-zero-length cues in
 * between. Keep only the newly introduced lines.
 */
export function parseRollingVtt(vtt: string): SubtitleCueDto[] {
  const cues: SubtitleCueDto[] = [];
  let lastLine: string | undefined;

  for (const cue of parseRawCues(vtt)) {
    const lines = [...cue.lines];
    while (lines.length > 0 && lines[0] === lastLine) lines.shift();
    if (lines.length === 0) continue;

    cues.push({ start: cue.start, end: cue.end, text: lines.join('\n') });
    lastLine = lines[lines.length - 1];
  }

  return cues;
}
