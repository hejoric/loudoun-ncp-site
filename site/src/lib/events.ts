/**
 * Event dates and times.
 *
 * The CMS stores a calendar date plus optional 24-hour start and end times. The
 * events are all in Loudoun County, so every time is read as America/New_York
 * wall-clock time. Turning that into an instant needs the Eastern offset *for
 * that date* (-05:00 in winter, -04:00 in summer), which is worked out with
 * Intl rather than hard-coded or pulled in from a date library.
 *
 * Like src/lib/images.ts, a malformed value throws at build time instead of
 * quietly publishing a wrong time.
 */

const TIME_ZONE = 'America/New_York';
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const offsetFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  timeZoneName: 'longOffset',
});

interface TimedEntry {
  date: string | null;
  endTime?: string | null;
}

function parseDate(date: string): [number, number, number] {
  const match = DATE_RE.exec(date);
  if (!match) throw new Error(`Event date "${date}" is not YYYY-MM-DD.`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Split a validated "HH:MM" into numbers; throws on anything else. */
function parseTime(time: string, field: string): [number, number] {
  const match = TIME_RE.exec(time);
  if (!match) throw new Error(`Event ${field} "${time}" is not 24-hour HH:MM (for example 11:00).`);
  return [Number(match[1]), Number(match[2])];
}

/** The New York UTC offset in minutes (negative) in force at an instant. */
function newYorkOffsetMinutes(instant: number): number {
  const name = offsetFormat.formatToParts(new Date(instant)).find((part) => part.type === 'timeZoneName')?.value ?? '';
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(name);
  if (!match) throw new Error(`Could not read the ${TIME_ZONE} offset from "${name}".`);
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

/** Offset in force at a New York wall-clock time, and the instant it names. */
function zoned(year: number, month: number, day: number, hour: number, minute: number) {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  // The offset at the wall-clock time read as UTC is off by at most the offset
  // itself, which only matters within hours of a clock change; re-reading it at
  // the resulting instant settles that.
  let offset = newYorkOffsetMinutes(wall);
  offset = newYorkOffsetMinutes(wall - offset * 60_000);
  return { instant: wall - offset * 60_000, offset };
}

function formatOffset(offset: number): string {
  const abs = Math.abs(offset);
  return `${offset < 0 ? '-' : '+'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/**
 * ISO 8601 datetime for `date` (YYYY-MM-DD) at `time` (HH:MM, New York), with
 * the offset for that date: 2026-11-07 11:00 -> "2026-11-07T11:00:00-05:00".
 */
export function zonedIso(date: string, time: string): string {
  const [year, month, day] = parseDate(date);
  const [hour, minute] = parseTime(time, 'time');
  const { offset } = zoned(year, month, day, hour, minute);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${formatOffset(offset)}`;
}

/**
 * The instant an event ends: its end time when set, otherwise 23:00 on its
 * date, both in New York. An event is upcoming while this is not past. The
 * 23:00 fallback comes before the 11:17 PM nightly rebuild, so that build moves
 * every event of the day to Past.
 */
export function eventEnd(entry: TimedEntry): Date {
  const [year, month, day] = parseDate(entry.date!);
  const [hour, minute]: [number, number] = entry.endTime ? parseTime(entry.endTime, 'endTime') : [23, 0];
  return new Date(zoned(year, month, day, hour, minute).instant);
}

/** "11:00" -> "11 AM", "09:30" -> "9:30 AM", "13:00" -> "1 PM". */
function clock(time: string, field: string): string {
  const [hour, minute] = parseTime(time, field);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** "11 AM - 1 PM", "9:30 AM - 12 PM", or just "11 AM"; empty without a start. */
export function formatTimeRange(startTime?: string | null, endTime?: string | null): string {
  if (!startTime) return '';
  const start = clock(startTime, 'startTime');
  return endTime ? `${start} - ${clock(endTime, 'endTime')}` : start;
}

/** Split a description on blank lines into paragraphs. */
export function paragraphs(text?: string | null): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const EMAIL_RE = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;

/**
 * Split a paragraph around the email addresses in it, so each can be rendered
 * as a link: plain text stays a string, an address becomes its two halves.
 */
export function emailParts(text: string): (string | { local: string; domain: string })[] {
  return text.split(EMAIL_RE).map((part, i) => {
    if (i % 2 === 0) return part;
    const at = part.indexOf('@');
    return { local: part.slice(0, at), domain: part.slice(at + 1) };
  });
}
