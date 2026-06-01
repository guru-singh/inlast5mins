import { DraftPost, XSignal } from "./types";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1RCKOX6On4L0U5IgOJQPDebjBg3uIcnjZ/export?format=csv&gid=394955357";

const fieldsToShow = [
  "Persona",
  "Activity",
  "Hair Style",
  "Outfit",
  "Location",
  "Mood",
  "Camera Angle",
  "Prompt Framework"
];

const dummyReferenceImage =
  "/images/1.jpg?1=1";

type SheetRow = Record<string, string>;

export async function fetchHappyFeetRecord(): Promise<{
  mode: "sheet";
  drafts: DraftPost[];
  signals: XSignal[];
  summary: {
    score: string;
    controversy: string;
    fanReaction: string;
    extra: string;
  };
}> {
  const response = await fetch(SHEET_CSV_URL, {
    cache: "no-store",
    headers: {
      accept: "text/csv,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`Google Sheet CSV failed: ${response.status}`);
  }

  const rows = parseCsv(await response.text());
  const target = getTargetSlot();
  const match = rows.find(
    (row) => normalize(row.Date) === target.date && normalize(row.Time) === target.time
  );

  if (!match) {
    throw new Error(`No Happy Feet record found for ${target.date} at ${target.time}.`);
  }

  const record = Object.fromEntries(fieldsToShow.map((field) => [field, match[field] ?? ""]));
  const content = JSON.stringify(record, null, 2);

  const drafts = [
    {
      id: "happy-feet-1",
      angle: `Happy Feet ${target.date} ${target.time}`,
      content,
      imageUrl: dummyReferenceImage,
      sourceTweetIds: [SHEET_CSV_URL],
      suggestedVisual: "Google Sheet prompt record rendered as JSON.",
      source: "Happy Feet Google Sheet"
    }
  ];

  return {
    mode: "sheet",
    drafts,
    signals: [
      {
        id: "happy-feet-1",
        text: content,
        author: "Google Sheet",
        username: "happyfeet",
        createdAt: new Date().toISOString(),
        category: "buzz",
        engagement: 1
      }
    ],
    summary: {
      score: `Matched ${target.date} at ${target.time}.`,
      controversy: match.Persona ?? "Happy Feet record selected.",
      fanReaction: match.Activity ?? "Prompt activity loaded.",
      extra: "Showing Persona, Activity, Hair Style, Outfit, Location, Mood, Camera Angle, and Prompt Framework."
    }
  };
}

function getTargetSlot() {
  const parts = getIndiaDateParts(new Date());
  let targetDate = parts.date;
  let targetTime = "10:00 AM";

  if (parts.hour < 10) {
    targetDate = getIndiaDateParts(new Date(Date.now() - 24 * 60 * 60 * 1000)).date;
    targetTime = "11:00 PM";
  } else if (parts.hour < 19) {
    targetTime = "10:00 AM";
  } else if (parts.hour < 23) {
    targetTime = "7:00 PM";
  } else {
    targetTime = "11:00 PM";
  }

  return {
    date: targetDate,
    time: targetTime
  };
}

function getIndiaDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    date: `${parts.day}-${parts.month}-${parts.year}`,
    hour: Number(parts.hour)
  };
}

function parseCsv(csv: string): SheetRow[] {
  const parsed = parseCsvRows(csv);
  const headers = parsed[0] ?? [];

  return parsed.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))
  );
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((item) => item.some(Boolean));
}

function normalize(value?: string) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}
