/**
 * SETUP (one-time, ~5 minutes):
 * 1. Open your Google Sheet.
 * 2. Extensions -> Apps Script.
 * 3. Delete any starter code in the editor, paste this whole file in.
 * 4. Click "Deploy" (top right) -> "New deployment".
 * 5. Click the gear icon next to "Select type" -> choose "Web app".
 * 6. Execute as: "Me". Who has access: "Anyone".
 * 7. Click "Deploy", authorize when prompted (it's your own script, safe to allow).
 * 8. Copy the "Web app URL" it gives you — that's what you paste into the
 *    app's Settings page as the "Apps Script URL".
 *
 * If you ever edit this script, you must create a NEW deployment (or use
 * "Manage deployments" -> edit -> new version) for changes to take effect.
 */

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

  // Expenses live in columns A-D, Income in columns F-I. Data starts on
  // row 3 (row 1 = section title, row 2 = column headers).
  const isIncome = body.kind === "income";
  const firstCol = isIncome ? 6 : 1; // F = 6, A = 1
  const numCols = 4;

  // Find the first empty row within this section (checking the date column).
  const lastRow = sheet.getMaxRows();
  let targetRow = 3;
  for (let r = 3; r <= lastRow; r++) {
    const cell = sheet.getRange(r, firstCol).getValue();
    if (cell === "" || cell === null) { targetRow = r; break; }
    targetRow = r + 1;
  }

  const date = new Date(body.occurred_on);
  sheet.getRange(targetRow, firstCol, 1, numCols).setValues([[
    date,
    body.amount,
    body.description ?? "",
    body.categoryName ?? "",
  ]]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, row: targetRow }))
    .setMimeType(ContentService.MimeType.JSON);
}
