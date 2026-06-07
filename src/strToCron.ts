import { EnglishToCronError } from "./errors";

// --- Internal types ---

enum ActionKind {
  FrequencyWith,
  FrequencyOnly,
  ClockTime,
  Day,
  Secund,
  Minute,
  Hour,
  Month,
  Year,
  RangeStart,
  RangeEnd,
  OnlyOn,
}

interface StartEnd {
  start: number | null;
  end: number | null;
}

interface StartEndString {
  start: string | null;
  end: string | null;
}

interface Stack {
  owner: ActionKind;
  frequency: number | null;
  frequencyEnd: number | null;
  frequencyStart: number | null;
  min: StartEnd | null;
  hour: StartEnd | null;
  day: StartEndString | null;
  month: StartEndString | null;
  year: StartEnd | null;
  dayOfWeek: string | null;
  isAndConnector: boolean;
  isBetweenRange: boolean;
}

interface Syntax {
  seconds: string;
  min: string;
  hour: string;
  dayOfMonth: string;
  dayOfWeek: string;
  month: string;
  year: string;
}

function defaultSyntax(): Syntax {
  return { seconds: "0", min: "*", hour: "*", dayOfMonth: "*", dayOfWeek: "?", month: "*", year: "*" };
}

function freqStr(stack: Stack): string {
  return stack.frequency !== null ? String(stack.frequency) : "*";
}

function formatCron(s: Syntax): string {
  return [s.seconds, s.min, s.hour, s.dayOfMonth, s.month, s.dayOfWeek, s.year]
    .map((v) => v.trim())
    .join(" ");
}

// --- Tokenizer ---

const RE_TOKENS_SOURCE = [
  "(?:seconds|second|secs|sec)",
  "(?:hours?|hrs)",
  "(?:minutes?|mins?|min)",
  "(?:months?|(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sept|oct|nov|dec)(?: ?and)?,? ?)+",
  "[0-9]+(?:th|nd|rd|st)",
  "(?:[0-9]+:)?[0-9]+ ?(?:am|pm)",
  "[0-9]+:[0-9]+",
  "(?:noon|midnight)",
  "(?:days?|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|mon|tue|wed|thu|fri|sat|sun)(?: ?and)?,? ?)+",
  "(?:[0-9]{4}[0-9]*(?: ?and)?,? ?)+",
  "[0-9]+",
  "(?:only on)",
  "(?:to|through|ending|end|and)",
  "(?:between|starting|start)",
].join("|");

function tokenize(input: string): string[] {
  let text = input.replace(", ", " and ");
  if (text.includes("only on")) {
    text = text.replace(" and only on", " only on");
  }
  const re = new RegExp(RE_TOKENS_SOURCE, "gi");
  return [...text.matchAll(re)].map((m) => m[0].trim());
}

// --- Action matchers ---

function tryFromToken(token: string): ActionKind | null {
  const t = token;
  const kinds: [ActionKind, () => boolean][] = [
    [ActionKind.FrequencyWith, () => /^[0-9]+(th|nd|rd|st)$/i.test(t)],
    [ActionKind.FrequencyOnly, () => /^[0-9]+$/.test(t)],
    [ActionKind.ClockTime, () => /^([0-9]+:)?[0-9]+ *(AM|PM)$/i.test(t) || /^([0-9]+:[0-9]+)$/.test(t) || /(noon|midnight)/i.test(t)],
    [ActionKind.Day, () => /^((days|day)|(((monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|mon|tue|wed|thu|fri|sat|sun)( ?and)?,? ?)+))$/i.test(t)],
    [ActionKind.Secund, () => /(seconds|second|secs|sec)/i.test(t)],
    [ActionKind.Minute, () => /(minutes?|mins?|min)/i.test(t)],
    [ActionKind.Hour, () => /(hour|hrs|hours)/i.test(t)],
    [ActionKind.Month, () => /^((months?|month)|(((january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sept|oct|nov|dec)( ?and)?,? ?)+))$/i.test(t)],
    [ActionKind.Year, () => /((years?|year)|([0-9]{4}[0-9]*(( ?and)?,? ?)+))/i.test(t)],
    [ActionKind.RangeStart, () => /(between|starting|start)/i.test(t)],
    [ActionKind.RangeEnd, () => /(to|through|ending|end|and)/i.test(t)],
    [ActionKind.OnlyOn, () => t.toLowerCase() === "only on"],
  ];
  for (const [kind, matcher] of kinds) {
    if (matcher()) return kind;
  }
  return null;
}

// --- Action processors ---

const RE_SECUND = /^(seconds|second|sec|secs)$/i;
function processSeconds(token: string, syntax: Syntax, stack: Stack[]): void {
  if (!RE_SECUND.test(token)) return;
  const last = stack[stack.length - 1];
  if (last) {
    if (last.owner === ActionKind.FrequencyOnly) {
      syntax.seconds = `0/${freqStr(last)!}`;
      stack.pop();
    } else if (last.owner === ActionKind.FrequencyWith) {
      syntax.seconds = freqStr(last)!;
      stack.pop();
    } else {
      syntax.seconds = "*";
    }
  } else {
    syntax.seconds = "*";
  }
  stack.push({ owner: ActionKind.Secund, frequency: null, frequencyEnd: null, frequencyStart: null, min: null, hour: null, day: null, month: null, year: null, dayOfWeek: null, isAndConnector: false, isBetweenRange: false });
}

const RE_MINUTES = /^(minutes?|mins?|min)$/i;
function processMinute(token: string, syntax: Syntax, stack: Stack[]): void {
  if (!RE_MINUTES.test(token)) return;
  let minutes: StartEnd | null = null;
  const last = stack[stack.length - 1];
  if (last) {
    if (last.owner === ActionKind.FrequencyOnly) {
      minutes = { start: last.frequency, end: null };
      syntax.min = `0/${freqStr(last)!}`;
      stack.pop();
    } else if (last.owner === ActionKind.FrequencyWith) {
      minutes = { start: last.frequency, end: null };
      syntax.min = freqStr(last)!;
      stack.pop();
    } else if (last.owner === ActionKind.RangeStart) {
      last.min = { start: last.frequencyStart, end: null };
      return;
    } else if (last.owner === ActionKind.RangeEnd) {
      last.min = { start: last.frequencyStart, end: last.frequencyEnd };
      last.frequencyEnd = null;
      if (last.frequencyStart !== null && last.frequencyEnd !== null) {
        syntax.min = `${last.frequencyStart}-${last.frequencyEnd}`;
      }
      return;
    }
  }
  if (minutes) {
    stack.push({ owner: ActionKind.Minute, frequency: null, frequencyEnd: null, frequencyStart: null, min: minutes, hour: null, day: null, month: null, year: null, dayOfWeek: null, isAndConnector: false, isBetweenRange: false });
  }
}

const RE_HOUR = /^(hour|hrs|hours)$/i;
function processHour(token: string, syntax: Syntax, stack: Stack[]): void {
  if (!RE_HOUR.test(token)) return;
  let hour: StartEnd | null = null;
  const last = stack[stack.length - 1];
  if (last) {
    if (last.owner === ActionKind.FrequencyOnly) {
      hour = { start: last.frequency, end: null };
      syntax.hour = `0/${freqStr(last)!}`;
      syntax.min = "0";
      stack.pop();
    } else if (last.owner === ActionKind.FrequencyWith) {
      hour = { start: last.frequency, end: null };
      syntax.hour = freqStr(last)!;
      syntax.min = "0";
      stack.pop();
    } else if (last.owner === ActionKind.RangeStart) {
      last.min = { start: last.frequencyStart, end: null };
      return;
    } else if (last.owner === ActionKind.RangeEnd) {
      last.min = { start: last.frequencyStart, end: last.frequencyEnd };
      last.frequencyEnd = null;
      if (last.frequencyStart !== null && last.frequencyEnd !== null) {
        syntax.hour = `${last.frequencyStart}-${last.frequencyEnd}`;
        syntax.min = "0";
      }
      return;
    }
  }
  syntax.min = "0";
  if (hour) {
    stack.push({ owner: ActionKind.Hour, frequency: null, frequencyEnd: null, frequencyStart: null, min: null, hour, day: null, month: null, year: null, dayOfWeek: null, isAndConnector: false, isBetweenRange: false });
  }
}

const RE_DAY = /^(day|days)$/i;
const RE_WEEKDAYS = /(MON|TUE|WED|THU|FRI|SAT|SUN|WEEKEND)/gi;
const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function processDay(token: string, syntax: Syntax, stack: Stack[]): void {
  if (RE_DAY.test(token)) {
    syntax.dayOfWeek = "?";
    if (syntax.min === "*") syntax.min = "0";
    if (syntax.hour === "*") syntax.hour = "0";
    const last = stack[stack.length - 1];
    if (last) {
      if (last.owner === ActionKind.FrequencyOnly) {
        syntax.dayOfMonth = `*/${freqStr(last)!}`;
        stack.pop();
      } else if (last.owner === ActionKind.FrequencyWith) {
        syntax.dayOfMonth = freqStr(last)!;
        stack.pop();
      } else {
        syntax.dayOfMonth = "*";
      }
    } else {
      syntax.dayOfMonth = "*/1";
    }
  } else {
    const matches = [...token.matchAll(RE_WEEKDAYS)].map((m) => m[0].toUpperCase());
    if (matches.length === 0) {
      throw EnglishToCronError.incorrectValue("day", `value ${token} is not a weekend format`);
    }
    syntax.dayOfWeek = "";
    const days = matches;
    const last = stack[stack.length - 1];
    if (last) {
      if (last.owner === ActionKind.RangeStart) {
        last.day = { start: days[0] ?? null, end: last.day?.end ?? null };
        return;
      } else if (last.owner === ActionKind.RangeEnd) {
        const data: StartEndString = { start: last.day?.start ?? null, end: days[0] ?? null };
        last.day = { ...data };
        if (data.start !== null && data.end !== null) {
          syntax.dayOfWeek = `${data.start}-${data.end}`;
        }
        syntax.dayOfMonth = "?";
        stack.pop();
        stack.push({ owner: ActionKind.Day, frequency: null, frequencyEnd: null, frequencyStart: null, min: null, hour: null, day: null, month: null, year: null, dayOfWeek: syntax.dayOfWeek, isAndConnector: false, isBetweenRange: false });
        return;
      } else if (last.owner === ActionKind.OnlyOn) {
        const day = days[0];
        if (!day) throw EnglishToCronError.incorrectValue("day", "Expected at least one day in 'only on' syntax but found none");
        syntax.dayOfWeek = day;
        syntax.dayOfMonth = "?";
        stack.pop();
        stack.push({ owner: ActionKind.Day, frequency: null, frequencyEnd: null, frequencyStart: null, min: null, hour: null, day: null, month: null, year: null, dayOfWeek: syntax.dayOfWeek, isAndConnector: false, isBetweenRange: false });
        return;
      }
      stack.length = 0;
    }
    for (const wd of WEEK_DAYS) {
      if (days.includes(wd) && !syntax.dayOfWeek.includes(wd)) {
        syntax.dayOfWeek += `${wd},`;
      }
    }
    if (days.includes("WEEKEND")) {
      for (const wd of ["SAT", "SUN"]) {
        if (!syntax.dayOfWeek.includes(wd)) syntax.dayOfWeek += `${wd},`;
      }
    }
    syntax.dayOfWeek = syntax.dayOfWeek.replace(/,+$/, "");
    syntax.dayOfMonth = "?";
  }
  stack.push({ owner: ActionKind.Day, frequency: null, frequencyEnd: null, frequencyStart: null, min: null, hour: null, day: null, month: null, year: null, dayOfWeek: syntax.dayOfWeek, isAndConnector: false, isBetweenRange: false });
}

const RE_MONTH = /^(months?|month)$/i;
const RE_MONTHS_ABBR = /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/gi;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function processMonth(token: string, syntax: Syntax, stack: Stack[]): void {
  if (RE_MONTH.test(token)) {
    const last = stack[stack.length - 1];
    if (last) {
      if (last.owner === ActionKind.FrequencyOnly) {
        syntax.month = freqStr(last)!;
        stack.pop();
      } else if (last.owner === ActionKind.FrequencyWith) {
        syntax.month = freqStr(last)!;
        stack.pop();
      } else if (last.owner === ActionKind.RangeEnd) {
        syntax.dayOfMonth = `${last.frequencyStart ?? 0},${last.frequencyEnd ?? 0}`;
      } else {
        syntax.month = "*";
      }
    } else {
      syntax.month = "*";
    }
  } else {
    const matches = [...token.matchAll(RE_MONTHS_ABBR)].map((m) => m[0].toUpperCase());
    if (matches.length === 0) {
      throw EnglishToCronError.incorrectValue("month", `value ${token} is not a month format`);
    }
    syntax.month = "";
    const months = matches;
    const last = stack[stack.length - 1];
    if (last) {
      if (last.owner === ActionKind.FrequencyOnly || last.owner === ActionKind.FrequencyWith) {
        syntax.dayOfMonth = freqStr(last)!;
        stack.pop();
      } else if (last.owner === ActionKind.RangeStart) {
        last.month = { start: months[0] ?? null, end: last.month?.end ?? null };
        stack.pop();
        return;
      } else if (last.owner === ActionKind.RangeEnd) {
        if (last.frequencyEnd !== null) {
          syntax.dayOfWeek = "?";
          if (last.frequencyStart !== null) {
            syntax.dayOfMonth = `${last.frequencyStart}-${last.frequencyEnd}`;
          }
        }
        const data: StartEndString = { start: last.month?.start ?? null, end: months[0] ?? null };
        last.month = { ...data };
        if (data.start !== null && data.end !== null) {
          syntax.month = `${data.start}-${data.end}`;
        }
        stack.pop();
        stack.push({ owner: ActionKind.Month, frequency: null, frequencyEnd: null, frequencyStart: null, min: null, hour: null, day: null, month: { start: syntax.month, end: null }, year: null, dayOfWeek: null, isAndConnector: false, isBetweenRange: false });
        return;
      } else {
        stack.pop();
      }
    }
    for (const m of MONTHS) {
      if (months.includes(m) && !syntax.month.includes(m)) {
        syntax.month += `${m},`;
      }
    }
    syntax.month = syntax.month.replace(/,+$/, "");
  }
  stack.push({ owner: ActionKind.Month, frequency: null, frequencyEnd: null, frequencyStart: null, min: null, hour: null, day: null, month: { start: syntax.month, end: null }, year: null, dayOfWeek: null, isAndConnector: false, isBetweenRange: false });
}

const RE_YEARS = /^(years?|year)$/i;
const RE_YEAR_NUMERIC = /[0-9]+/g;
const RE_YEAR_FORMAT = /^[0-9]{4}$/;

function processYear(token: string, syntax: Syntax, stack: Stack[]): void {
  if (RE_YEARS.test(token)) {
    syntax.year = "?";
    const last = stack[stack.length - 1];
    if (last) {
      if (last.owner === ActionKind.FrequencyOnly) {
        syntax.year = `0/${freqStr(last)!}`;
        stack.pop();
      } else if (last.owner === ActionKind.FrequencyWith) {
        syntax.year = freqStr(last)!;
      } else {
        syntax.year = "*";
      }
    }
  } else {
    const matches = [...token.matchAll(RE_YEAR_NUMERIC)].map((m) => m[0]);
    const years = matches.filter((y) => RE_YEAR_FORMAT.test(y)).map((y) => parseInt(y, 10)).filter((n) => !isNaN(n));
    const last = stack[stack.length - 1];
    if (last) {
      if (last.owner === ActionKind.RangeStart) {
        last.year = { start: years[0] ?? null, end: last.year?.end ?? null };
        return;
      } else if (last.owner === ActionKind.RangeEnd) {
        const yearData: StartEnd = { start: last.year?.start ?? null, end: years[0] ?? null };
        syntax.year = `${yearData.start ?? 0}-${yearData.end ?? 0}`;
        stack.pop();
        stack.push({ owner: ActionKind.Year, frequency: null, frequencyEnd: null, frequencyStart: null, min: null, hour: null, day: null, month: null, year: null, dayOfWeek: null, isAndConnector: false, isBetweenRange: false });
        return;
      }
    }
    if (years.length === 0) {
      throw EnglishToCronError.incorrectValue("year", `value ${token} is not a year format`);
    }
    syntax.year = "";
    for (const year of years) {
      syntax.year += `${year},`;
    }
    syntax.year = syntax.year.replace(/,+$/, "");
  }
  stack.push({ owner: ActionKind.Year, frequency: null, frequencyEnd: null, frequencyStart: null, min: null, hour: null, day: null, month: null, year: null, dayOfWeek: null, isAndConnector: false, isBetweenRange: false });
}

const RE_CLOCK_EXACT = /^([0-9]+:)?[0-9]+ *(AM|PM)$/i;
const RE_CLOCK_24 = /^[0-9]+:[0-9]+$/;
const RE_CLOCK_NOON = /(noon|midnight)/i;
const RE_HOUR_EXTRACT = /^[0-9]+/;
const RE_MINUTE_EXTRACT = /:[0-9]+/;

function processClockTime(token: string, syntax: Syntax, stack: Stack[]): void {
  let hour = 0;
  let minute = 0;

  const hourMatch = token.match(RE_HOUR_EXTRACT);
  if (hourMatch) {
    const n = parseInt(hourMatch[0], 10);
    if (isNaN(n)) throw EnglishToCronError.parseToNumber("clock_time", hourMatch[0]);
    hour = n;
  }

  const minuteMatch = token.match(RE_MINUTE_EXTRACT);
  if (minuteMatch) {
    const m = parseInt(minuteMatch[0].substring(1), 10);
    if (isNaN(m)) throw EnglishToCronError.parseToNumber("clock_time", minuteMatch[0]);
    if (m >= 60) throw EnglishToCronError.incorrectValue("clock_time", `minute ${m} should be lower or equal to 60`);
    minute = m;
  }

  const lower = token.toLowerCase();
  if (lower.includes("pm")) {
    if (hour < 12) hour += 12;
    else if (hour > 12) throw EnglishToCronError.incorrectValue("clock_time", `please correct the time before PM. value: ${hour}`);
  } else if (lower.includes("am")) {
    if (hour === 12) hour = 0;
    else if (hour > 12) throw EnglishToCronError.incorrectValue("clock_time", `please correct the time before AM. value: ${hour}`);
  }

  if (RE_CLOCK_NOON.test(token)) {
    if (lower === "noon") hour = 12;
    else hour = 0;
    minute = 0;
  }

  const last = stack[stack.length - 1];
  if (last) {
    if (last.owner === ActionKind.RangeStart) {
      last.hour = { start: hour, end: null };
      return;
    } else if (last.owner === ActionKind.RangeEnd) {
      if (last.hour) {
        if (last.hour.start === hour) {
          last.min = { start: hour, end: hour };
          syntax.hour = `${hour}-${hour}`;
        } else {
          last.hour.end = hour;
          if (last.isAndConnector && !last.isBetweenRange) {
            if (syntax.hour.includes(",")) {
              syntax.hour = `${syntax.hour},${hour}`;
            } else {
              syntax.hour = `${last.hour.start ?? 0},${hour}`;
            }
          } else {
            syntax.hour = `${last.hour.start ?? 0}-${hour}`;
          }
        }
      }
      return;
    }
  }

  syntax.min = String(minute);
  syntax.hour = String(hour);
  stack.push({ owner: ActionKind.ClockTime, frequency: null, frequencyEnd: null, frequencyStart: null, min: { start: minute, end: null }, hour: { start: hour, end: null }, day: null, month: null, year: null, dayOfWeek: null, isAndConnector: false, isBetweenRange: false });
}

function processFrequencyOnly(frequency: number, syntax: Syntax, stack: Stack[]): void {
  if (stack.length > 0) {
    const last = stack[stack.length - 1];
    if (last) {
      if (last.owner === ActionKind.RangeEnd) { last.frequencyEnd = frequency; return; }
      if (last.owner === ActionKind.RangeStart) { last.frequencyStart = frequency; return; }
    }
  }
  stack.push({ owner: ActionKind.FrequencyOnly, frequency, frequencyEnd: null, frequencyStart: null, min: null, hour: null, day: null, month: null, year: null, dayOfWeek: null, isAndConnector: false, isBetweenRange: false });
}

const RE_NUMERIC_PREFIX = /^[0-9]+/;

function processFrequencyWith(token: string, syntax: Syntax, stack: Stack[]): void {
  const match = token.match(RE_NUMERIC_PREFIX);
  if (!match) throw EnglishToCronError.capture("frequency_with", token);
  const frequency = parseInt(match[0], 10);
  if (isNaN(frequency)) throw EnglishToCronError.parseToNumber("frequency_with", match[0]);

  const last = stack[stack.length - 1];
  if (last) {
    if (last.owner === ActionKind.RangeEnd) { last.frequencyEnd = frequency; return; }
    if (last.owner === ActionKind.RangeStart) { last.frequencyStart = frequency; return; }
  }
  stack.push({ owner: ActionKind.FrequencyWith, frequency, frequencyEnd: null, frequencyStart: null, min: null, hour: null, day: null, month: null, year: null, dayOfWeek: syntax.dayOfWeek, isAndConnector: false, isBetweenRange: false });
}

const RE_BETWEEN = /between/i;

function processRangeStart(token: string, syntax: Syntax, stack: Stack[]): void {
  const s: Stack = { owner: ActionKind.RangeStart, frequency: null, frequencyEnd: null, frequencyStart: null, min: null, hour: null, day: null, month: null, year: null, dayOfWeek: null, isAndConnector: false, isBetweenRange: RE_BETWEEN.test(token) };
  stack.push(s);
}

const RE_AND = /and/i;

function processRangeEnd(token: string, syntax: Syntax, stack: Stack[]): void {
  const isAnd = RE_AND.test(token);
  const last = stack[stack.length - 1];
  if (last) {
    last.isAndConnector = isAnd;
    switch (last.owner) {
      case ActionKind.FrequencyWith:
      case ActionKind.FrequencyOnly:
        last.frequencyStart = last.frequency;
        break;
      case ActionKind.Day:
        last.day = { start: last.dayOfWeek, end: last.day?.end ?? null };
        break;
      case ActionKind.Month:
        last.owner = ActionKind.RangeEnd;
        break;
      case ActionKind.RangeStart:
        break;
      default:
        break;
    }
    last.owner = ActionKind.RangeEnd;
  }
}

function processAction(kind: ActionKind, token: string, syntax: Syntax, stack: Stack[]): void {
  switch (kind) {
    case ActionKind.FrequencyWith: processFrequencyWith(token, syntax, stack); break;
    case ActionKind.FrequencyOnly: {
      const freq = parseInt(token, 10);
      if (isNaN(freq)) throw EnglishToCronError.parseToNumber("frequency_only", token);
      processFrequencyOnly(freq, syntax, stack);
      break;
    }
    case ActionKind.ClockTime: processClockTime(token, syntax, stack); break;
    case ActionKind.Day: processDay(token, syntax, stack); break;
    case ActionKind.Secund: processSeconds(token, syntax, stack); break;
    case ActionKind.Minute: processMinute(token, syntax, stack); break;
    case ActionKind.Hour: processHour(token, syntax, stack); break;
    case ActionKind.Month: processMonth(token, syntax, stack); break;
    case ActionKind.Year: processYear(token, syntax, stack); break;
    case ActionKind.RangeStart: processRangeStart(token, syntax, stack); break;
    case ActionKind.RangeEnd: processRangeEnd(token, syntax, stack); break;
    case ActionKind.OnlyOn: break;
  }
}

// --- Public API ---

function cronNew(text: string): Syntax {
  const tokens = tokenize(text);
  if (tokens.length === 0) throw EnglishToCronError.invalidInput();

  const syntax = defaultSyntax();
  const stack: Stack[] = [];

  for (const token of tokens) {
    const kind = tryFromToken(token);
    if (kind !== null) {
      processAction(kind, token, syntax, stack);
    }
  }
  return syntax;
}

/**
 * Converts an English description of a schedule into a cron expression string.
 * Throws an EnglishToCronError if the input cannot be parsed.
 */
export function strCronSyntax(input: string): string {
  return formatCron(cronNew(input));
}