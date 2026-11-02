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
  startTime?: string | null;
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
function zoned(year: number, month: number, day: number, hour: number, minute: number, second: number) {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
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
export function zonedIso(date: string, time: string, second = 0): string {
  const [year, month, day] = parseDate(date);
  const [hour, minute] = parseTime(time, 'time');
  const { offset } = zoned(year, month, day, hour, minute, second);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}${formatOffset(offset)}`;
}

/** The instant an event starts: its start time, or the start of its date. */
export function eventStart(entry: TimedEntry): Date {
  const [year, month, day] = parseDate(entry.date!);
  const [hour, minute] = entry.startTime ? parseTime(entry.startTime, 'startTime') : [0, 0];
  return new Date(zoned(year, month, day, hour, minute, 0).instant);
}

/**
 * The instant an event ends: its end time when set, otherwise the end of its
 * date (23:59:59) in New York. An event is upcoming while this is not past.
 */
export function eventEnd(entry: TimedEntry): Date {
  const [year, month, day] = parseDate(entry.date!);
  const [hour, minute, second] = entry.endTime ? [...parseTime(entry.endTime, 'endTime'), 0] : [23, 59, 59];
  return new Date(zoned(year, month, day, hour, minute, second).instant);
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
