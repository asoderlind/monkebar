import { google } from "googleapis";
import type {
  WorkoutWeek,
  Exercise,
  WorkoutSet,
  DayOfWeek,
  ParsedSetValue,
} from "@monke-bar/shared";
import { db } from "../db/index.js";
import { accounts } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

/**
 * Parse a cell value like "70kg, 3" or "70kg,3" into weight and reps
 */
export function parseSetValue(
  cellValue: string | null | undefined
): ParsedSetValue {
  if (!cellValue || typeof cellValue !== "string") {
    return null;
  }

  // Handle various formats: "70kg, 3", "70kg,3", "70, 3", "70 3"
  const cleanValue = cellValue.trim();
  if (!cleanValue) return null;

  // Try to match patterns like "70kg, 3" or "70, 3"
  const match = cleanValue.match(
    /^(\d+(?:\.\d+)?)\s*(?:kg)?\s*[,\s]\s*(\d+)$/i
  );
  if (match) {
    return {
      weight: parseFloat(match[1]),
      reps: parseInt(match[2], 10),
    };
  }

  return null;
}

/**
 * Format a set value back to sheet format
 */
export function formatSetValue(weight: number, reps: number): string {
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
 * Day column mappings based on the spreadsheet structure
 */
const DAY_COLUMNS: Array<{
  day: DayOfWeek;
  exerciseCol: number;
  warmupCol: number;
  set1Col: number;
  set2Col: number;
  set3Col: number;
  set4Col: number;
}> = [
  {
    day: "Monday",
    exerciseCol: 1,
    warmupCol: 2,
    set1Col: 3,
    set2Col: 4,
    set3Col: 5,
    set4Col: 6,
  },
  {
    day: "Tuesday",
    exerciseCol: 7,
    warmupCol: 8,
    set1Col: 9,
    set2Col: 10,
    set3Col: 11,
    set4Col: 12,
  },
  {
    day: "Wednesday",
    exerciseCol: 13,
    warmupCol: 14,
    set1Col: 15,
    set2Col: 16,
    set3Col: 17,
    set4Col: 18,
  },
  {
    day: "Thursday",
    exerciseCol: 19,
    warmupCol: 20,
    set1Col: 21,
    set2Col: 22,
    set3Col: 23,
    set4Col: 24,
  },
  {
    day: "Friday",
    exerciseCol: 25,
    warmupCol: 26,
    set1Col: 27,
    set2Col: 28,
    set3Col: 29,
    set4Col: 30,
  },
  {
    day: "Saturday",
    exerciseCol: 31,
    warmupCol: 32,
    set1Col: 33,
    set2Col: 34,
    set3Col: 35,
    set4Col: 36,
  },
  {
    day: "Sunday",
    exerciseCol: 37,
    warmupCol: 38,
    set1Col: 39,
    set2Col: 40,
    set3Col: 41,
    set4Col: 42,
  },
];

/**
 * Parse exercises from rows for a specific day
 */
function parseExercisesFromRows(
  rows: (string | null | undefined)[][],
  dayConfig: (typeof DAY_COLUMNS)[0],
  startRowIndex: number
): Exercise[] {
  const exercises: Exercise[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const exerciseName = row[dayConfig.exerciseCol]?.toString().trim();

    if (!exerciseName) continue;

    const sets: WorkoutSet[] = [];

    // Warmup set
    const warmupValue = parseSetValue(row[dayConfig.warmupCol]?.toString());
    if (warmupValue) {
      sets.push({
        weight: warmupValue.weight,
        reps: warmupValue.reps,
        isWarmup: true,
        setNumber: 0,
      });
    }

    // Working sets 1-4
    const setCols = [
      dayConfig.set1Col,
      dayConfig.set2Col,
      dayConfig.set3Col,
      dayConfig.set4Col,
    ];
    setCols.forEach((col, idx) => {
      const setValue = parseSetValue(row[col]?.toString());
      if (setValue) {
        sets.push({
          weight: setValue.weight,
          reps: setValue.reps,
          isWarmup: false,
          setNumber: idx + 1,
        });
      }
    });

    if (sets.length > 0) {
      exercises.push({
        id: `${startRowIndex + i}-${dayConfig.day}-${exerciseName}`,
        name: exerciseName,
        sets,
      });
    }
  }

  return exercises;
}

/**
 * Fetch all workout data from Google Sheets
 */
export async function fetchWorkoutData(
  userId: string,
  spreadsheetId: string,
  sheetName: string = "Sheet1"
): Promise<WorkoutWeek[]> {
  const sheets = await getSheetsClient(userId);

  // Fetch all data from the sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:AQ`, // Covers Week column through Sunday
  });

  const rows = response.data.values || [];
  if (rows.length < 3) {
    return []; // Need at least header rows + data
  }

  const weeks: WorkoutWeek[] = [];
  let currentWeek: WorkoutWeek | null = null;
  let currentWeekRows: (string | null | undefined)[][] = [];
  let currentWeekStartRow = 3; // Data starts after headers (row 3 in 1-indexed)

  // Skip header rows (row 1 = day headers, row 2 = column headers)
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const weekCell = row[0]?.toString().trim();

    // Check if this is a new week indicator
    if (weekCell && /^\d+$/.test(weekCell)) {
      // Save previous week if exists
      if (currentWeek && currentWeekRows.length > 0) {
        // Parse exercises for each day
        for (const dayConfig of DAY_COLUMNS) {
          const exercises = parseExercisesFromRows(
            currentWeekRows,
            dayConfig,
            currentWeekStartRow
          );
          if (exercises.length > 0) {
            currentWeek.days.push({
              dayOfWeek: dayConfig.day,
              exercises,
            });
          }
        }
        weeks.push(currentWeek);
      }

      // Start new week
      currentWeek = {
        weekNumber: parseInt(weekCell, 10),
        days: [],
      };
      currentWeekRows = [row];
      currentWeekStartRow = i;
    } else if (currentWeek) {
      // Continue current week
      currentWeekRows.push(row);
    }
  }

  // Don't forget the last week
  if (currentWeek && currentWeekRows.length > 0) {
    for (const dayConfig of DAY_COLUMNS) {
      const exercises = parseExercisesFromRows(
        currentWeekRows,
        dayConfig,
        currentWeekStartRow
      );
      if (exercises.length > 0) {
        currentWeek.days.push({
          dayOfWeek: dayConfig.day,
          exercises,
        });
      }
    }
    weeks.push(currentWeek);
  }

  return weeks;
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
