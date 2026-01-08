import { google } from "googleapis";
import type {
  Workout,
  Exercise,
  WorkoutSet,
  DayOfWeek,
  ParsedSetValue,
} from "@monke-bar/shared";
import { db } from "../db/index.js";
import { accounts } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

/**
 * Parse a cell value like "70kg, 3" or "70kg,3" or just "10" (bodyweight reps) into weight and reps
 */
export function parseSetValue(
  cellValue: string | null | undefined
): ParsedSetValue {
  if (!cellValue || typeof cellValue !== "string") {
    return null;
  }

  // Handle various formats: "70kg, 3", "70kg,3", "70, 3", "70 3", or just "10" (bodyweight)
  const cleanValue = cellValue.trim();
  if (!cleanValue) return null;

  // Try to match patterns with weight: "70kg, 3" or "70, 3"
  const weightMatch = cleanValue.match(
    /^(\d+(?:\.\d+)?)\s*(?:kg)?\s*[,\s]\s*(\d+)$/i
  );
  if (weightMatch) {
    return {
      weight: parseFloat(weightMatch[1]),
      reps: parseInt(weightMatch[2], 10),
    };
  }

  // Try to match bodyweight pattern: just a number (reps only)
  const bodyweightMatch = cleanValue.match(/^(\d+)$/i);
  if (bodyweightMatch) {
    return {
      weight: 0, // 0 weight indicates bodyweight exercise
      reps: parseInt(bodyweightMatch[1], 10),
    };
  }

  return null;
}

/**
 * Format a set value back to sheet format
 */
export function formatSetValue(weight: number, reps: number): string {
  // If weight is 0, it's a bodyweight exercise - just return reps
  if (weight === 0) {
    return `${reps}`;
  }
  return `${weight}kg, ${reps}`;
}

/**
 * Get user's Google OAuth access token from database
 */
async function getUserAccessToken(userId: string): Promise<string | null> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "google")));

  if (!account?.accessToken) {
    return null;
  }

  // Check if token is expired
  if (
    account.accessTokenExpiresAt &&
    account.accessTokenExpiresAt < new Date()
  ) {
    // Token expired - need to refresh
    if (account.refreshToken) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials({ refresh_token: account.refreshToken });

      try {
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update token in database
        await db
          .update(accounts)
          .set({
            accessToken: credentials.access_token,
            accessTokenExpiresAt: credentials.expiry_date
              ? new Date(credentials.expiry_date)
              : null,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, account.id));

        return credentials.access_token || null;
      } catch (error) {
        console.error("Failed to refresh token:", error);
        return null;
      }
    }
    return null;
  }

  return account.accessToken;
}

/**
 * Get authenticated Google Sheets client for a user
 */
async function getSheetsClient(userId: string) {
  const accessToken = await getUserAccessToken(userId);

  if (!accessToken) {
    throw new Error("No valid Google access token. Please re-authenticate.");
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth: oauth2Client });
  return sheets;
}

/**
 * Update a specific cell in the sheet
 */
export async function updateCell(
  userId: string,
  spreadsheetId: string,
  sheetName: string,
  row: number,
  col: string,
  value: string
): Promise<void> {
  const sheets = await getSheetsClient(userId);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${col}${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[value]],
    },
  });
}

/**
 * Get spreadsheet metadata
 */
export async function getSpreadsheetInfo(
  userId: string,
  spreadsheetId: string
) {
  const sheets = await getSheetsClient(userId);

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  return {
    title: response.data.properties?.title,
    sheets: response.data.sheets?.map((s) => ({
      title: s.properties?.title,
      sheetId: s.properties?.sheetId,
    })),
  };
}

/**
 * List user's spreadsheets (for spreadsheet picker)
 */
export async function listUserSpreadsheets(userId: string) {
  const accessToken = await getUserAccessToken(userId);

  if (!accessToken) {
    throw new Error("No valid Google access token. Please re-authenticate.");
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet'",
    fields: "files(id, name, modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: 20,
  });

  return response.data.files || [];
}

/**
 * Workout Log Sheet Structure (normalized, easy to parse and append)
 * Columns: Date | Day | Exercise | Group | Warmup | Set1 | Set2 | Set3 | Set4
 */
const WORKOUT_LOG_HEADERS = [
  "Date",
  "Day",
  "Exercise",
  "Group",
  "Warmup",
  "Set1",
  "Set2",
  "Set3",
  "Set4",
];

/**
 * Check if a sheet exists in a spreadsheet
 */
export async function sheetExists(
  userId: string,
  spreadsheetId: string,
  sheetName: string
): Promise<boolean> {
  const info = await getSpreadsheetInfo(userId, spreadsheetId);
  return info.sheets?.some((s) => s.title === sheetName) ?? false;
}

/**
 * Create a new sheet in the spreadsheet with headers
 */
export async function createWorkoutLogSheet(
  userId: string,
  spreadsheetId: string,
  sheetName: string = "Workout Log"
): Promise<void> {
  const sheets = await getSheetsClient(userId);

  // First create the sheet
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName,
            },
          },
        },
      ],
    },
  });

  // Then add headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1:I1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [WORKOUT_LOG_HEADERS],
    },
  });

  // Format the header row (bold, frozen)
  const sheetInfo = await getSpreadsheetInfo(userId, spreadsheetId);
  const newSheet = sheetInfo.sheets?.find((s) => s.title === sheetName);

  if (newSheet?.sheetId !== undefined) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: newSheet.sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                },
              },
              fields: "userEnteredFormat(textFormat,backgroundColor)",
            },
          },
          {
            updateSheetProperties: {
              properties: {
                sheetId: newSheet.sheetId,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              fields: "gridProperties.frozenRowCount",
            },
          },
          // Set column widths
          {
            updateDimensionProperties: {
              range: {
                sheetId: newSheet.sheetId,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 1, // Date column
              },
              properties: { pixelSize: 100 },
              fields: "pixelSize",
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: newSheet.sheetId,
                dimension: "COLUMNS",
                startIndex: 3,
                endIndex: 4, // Exercise column
              },
              properties: { pixelSize: 180 },
              fields: "pixelSize",
            },
          },
        ],
      },
    });
  }
}

/**
 * Workout entry for the log
 */
export interface WorkoutLogEntry {
  date: string; // YYYY-MM-DD format
  day: DayOfWeek;
  exercise: string;
  warmup?: { weight: number; reps: number };
  sets: Array<{ weight: number; reps: number }>;
  groupId?: string; // ID for linking superset exercises (e.g., "SS1")
  groupType?: "superset"; // Type of grouping - currently only superset supported
}

/**
 * Append workout entries to the log sheet
 */
export async function appendWorkoutEntries(
  userId: string,
  spreadsheetId: string,
  sheetName: string,
  entries: WorkoutLogEntry[]
): Promise<number> {
  const sheets = await getSheetsClient(userId);

  const rows = entries.map((entry) => [
    entry.date,
    entry.day,
    entry.exercise,
    entry.warmup ? formatSetValue(entry.warmup.weight, entry.warmup.reps) : "",
    entry.sets[0]
      ? formatSetValue(entry.sets[0].weight, entry.sets[0].reps)
      : "",
    entry.sets[1]
      ? formatSetValue(entry.sets[1].weight, entry.sets[1].reps)
      : "",
    entry.sets[2]
      ? formatSetValue(entry.sets[2].weight, entry.sets[2].reps)
      : "",
    entry.sets[3]
      ? formatSetValue(entry.sets[3].weight, entry.sets[3].reps)
      : "",
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:H`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: rows,
    },
  });

  return rows.length;
}

/**
 * Fetch workout log data (normalized format)
 * Sheet format: Date | Day | Exercise | Warmup | Set1 | Set2 | Set3 | Set4
 * Returns flat array of Workout objects, one per date, sorted by date ascending
 */
export async function fetchWorkoutLogData(
  userId: string,
  spreadsheetId: string,
  sheetName: string = "Workout Log"
): Promise<Workout[]> {
  const sheets = await getSheetsClient(userId);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:H`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) {
    return []; // Need header + data
  }

  // Group exercises by date
  const workoutMap = new Map<string, Exercise[]>();

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateStr = row[0]?.toString();
    const exerciseName = row[2]?.toString();

    if (!dateStr || !exerciseName) continue;

    if (!workoutMap.has(dateStr)) {
      workoutMap.set(dateStr, []);
    }

    const sets: WorkoutSet[] = [];

    // Warmup (column D, index 3)
    const warmup = parseSetValue(row[3]?.toString());
    if (warmup) {
      sets.push({ ...warmup, isWarmup: true, setNumber: 0 });
    }

    // Sets 1-4 (columns E-H, index 4-7)
    for (let s = 0; s < 4; s++) {
      const setValue = parseSetValue(row[4 + s]?.toString());
      if (setValue) {
        sets.push({ ...setValue, isWarmup: false, setNumber: s + 1 });
      }
    }

    workoutMap.get(dateStr)!.push({
      id: `${i}-${dateStr}-${exerciseName}`,
      name: exerciseName,
      sets,
    });
  }

  // Convert to Workout array sorted by date
  const workouts: Workout[] = Array.from(workoutMap.entries())
    .map(([date, exercises]) => ({ date, exercises }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return workouts;
}
