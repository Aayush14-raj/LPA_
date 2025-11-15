// ======================================
// 🌍 EXPRESS + ENV CONFIG (FINAL WORKING)
// ======================================
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const ExcelJS = require("exceljs");
const mysql = require("mysql2");
const mysqlPromise = require("mysql2/promise");

// Load correct env file depending on environment
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ path: ".env" });
  console.log("🚀 PRODUCTION MODE → Using Railway DB");
} else {
  require("dotenv").config({ path: ".env.local" });
  console.log("💻 LOCAL MODE → Using Local MySQL DB");
}

// ⭐ Create Express App (MUST be before app.use calls)
const app = express();

// ⭐ Required for Render frontend requests
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// ⭐ Body Parser Middleware
app.use(bodyParser.json());


// Debugging (Recommended to SEE which DB is used)
console.log("➡ DB HOST:", process.env.DB_HOST);
console.log("➡ DB NAME:", process.env.DB_NAME);
console.log("➡ DB USER:", process.env.DB_USER);


// ======================================
// 🗄 MySQL Config — Shared for both Modes
// ======================================
const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
};

// Callback connection (old routes)
const db = mysql.createConnection(dbConfig);

// Promise Pool (LPA calendar + new routes)
const dbPromise = mysqlPromise.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Check DB connection
db.connect((err) => {
  if (err) console.error("❌ DB ERROR:", err.message);
  else console.log("✅ DATABASE CONNECTED SUCCESSFULLY ✔");
});

const pdfDir = path.join(__dirname, "generated_pdfs");
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });




// ==============================
// ✅ API Routes (all prefixed with /api)
// ==============================
// Auto-create tables on startup
const createTables = async () => {
  try {
    await dbPromise.query(`
      CREATE TABLE IF NOT EXISTS audit_sessions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        role VARCHAR(100) NOT NULL,
        employee_id VARCHAR(50),
        plant_name VARCHAR(100),
        value_stream VARCHAR(100),
        shift_time VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbPromise.query(`
      CREATE TABLE IF NOT EXISTS audit_items (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        category VARCHAR(100) NOT NULL,
        question TEXT NOT NULL,
        status ENUM('Confirmed','Not Confirmed') NOT NULL,
        comment TEXT,
        is_resolved TINYINT(1) DEFAULT 0,
        action_taken TEXT,
        updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES audit_sessions(id) ON DELETE CASCADE
      );
    `);

    await dbPromise.query(`
      CREATE TABLE IF NOT EXISTS lpa_calendar (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        plant VARCHAR(50),
        month VARCHAR(20),
        year INT,
        data_json JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("📦 Tables checked/created successfully");
  } catch (err) {
    console.error("❌ Table creation error:", err.message);
  }
};

createTables();


// --------------------------------------------------
// 🔵 Fetch ALL audit sessions with their items
// --------------------------------------------------
app.get("/api/getAudits", (req, res) => {
  console.log("GET /api/getAudits called");

  const filterResolved = req.query.filterResolved === "true";
  const plant = req.query.plant;

  const conditions = [];
  const params = [];

  if (filterResolved) {
    conditions.push("(i.is_resolved = FALSE OR i.is_resolved IS NULL)");
  }
  if (plant && plant !== "all") {
    conditions.push("s.plant_name = ?");
    params.push(plant);
  }

  let sql = `
    SELECT 
      s.id AS session_id,
      s.role,
      s.employee_id,
      s.plant_name,
      s.value_stream,
      s.shift_time,
      s.created_at AS session_created_at,
      i.id AS item_id,
      i.category,
      i.question,
      i.status,
      i.comment,
      i.action_taken,
      i.is_resolved
    FROM audit_sessions s
    LEFT JOIN audit_items i ON s.id = i.session_id
  `;

  if (conditions.length) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += ` ORDER BY s.created_at DESC, i.id ASC`;

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch audits" });

    const grouped = {};
    rows.forEach(row => {
      const sessionId = row.session_id;
      if (!grouped[sessionId]) {
        grouped[sessionId] = {
          session: {
            id: row.session_id,
            role: row.role,
            employee_id: row.employee_id,
            plant_name: row.plant_name,
            value_stream: row.value_stream,
            shift_time: row.shift_time,
            created_at: row.session_created_at
          },
          items: []
        };
      }
      if (row.item_id) {
        grouped[sessionId].items.push({
          id: row.item_id,
          category: row.category,
          question: row.question,
          status: row.status,
          comment: row.comment,
          action_taken: row.action_taken,
          is_resolved: row.is_resolved || false
        });
      }
    });

    res.json({ audits: Object.values(grouped) });
  });
});

// --------------------------------------------------
// 🔵 Mark audit item as resolved
// --------------------------------------------------
app.post("/api/markResolved", (req, res) => {
  let { id } = req.body;

  console.log("📥 markResolved called with id:", id);

  if (!id) {
    return res.status(400).json({ error: "Item ID is required" });
  }

  id = parseInt(id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid Item ID" });
  }

  const sql = `UPDATE audit_items SET is_resolved = 1 WHERE id = ?`;
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("❌ MySQL error while marking resolved:", err);
      return res.status(500).json({ error: "Failed to mark item as resolved" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ success: true, message: "Item marked as resolved" });
  });
});

// --------------------------------------------------
// 🔵 Save Audit Session and Items
// --------------------------------------------------
app.post("/api/saveAudit", (req, res) => {
  console.log("📥 Incoming audit body:", req.body);
  const { role, employee_id, plant_name, value_stream, shift_time, items } = req.body;

  if (!role || !employee_id || !plant_name || !value_stream) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const allowedCategories = ['Safety','5S','Quality','Maintenance','Shop Floor Management','Others'];

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "No audit items provided" });
  }

  const invalidItems = items
    .map((it, idx) => ({ idx, category: it.category }))
    .filter(x => !x.category || !allowedCategories.includes(x.category));

  if (invalidItems.length > 0) {
    return res.status(400).json({
      error: "Invalid or missing category detected",
      invalidItems
    });
  }

  const sessionSql = `
    INSERT INTO audit_sessions (role, employee_id, plant_name, value_stream, shift_time)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(
    sessionSql,
    [role, employee_id, plant_name, value_stream, shift_time || null],
    (err, result) => {
      if (err) {
        console.error("❌ Error inserting audit session:", err);
        return res.status(500).json({ error: "Failed to insert audit session" });
      }

      const sessionId = result.insertId;

      const itemValues = items.map(it => [
        sessionId,
        it.category,
        it.question || "",
        it.status === "Confirmed" ? "Confirmed" : "Not Confirmed",
        it.comment || null,
        false
      ]);

      const itemSql = `
        INSERT INTO audit_items (session_id, category, question, status, comment, is_resolved)
        VALUES ?
      `;
      db.query(itemSql, [itemValues], (err2) => {
        if (err2) {
          console.error("❌ Error inserting audit items:", err2);
          return res.status(500).json({ error: "Failed to insert audit items" });
        }

        res.status(201).json({
          success: true,
          message: "✅ Audit & Items Saved Successfully",
          session_id: sessionId
        });
      });
    }
  );
});

// --------------------------------------------------
// 🔵 Dashboard Summary (Supports month & plant filters)
// --------------------------------------------------
app.get("/api/dashboard-summary", (req, res) => {
  const month = req.query.month;
  const plant = req.query.plant;
  const conditions = [];
  const params = [];

  if (month && month !== "all" && month !== "year") {
    const [yStr, mStr] = month.split("-");
    const year = parseInt(yStr, 10);
    const monthNum = parseInt(mStr, 10);
    conditions.push("YEAR(s.created_at) = ? AND MONTH(s.created_at) = ?");
    params.push(year, monthNum);
  } else if (month === "year") {
    const thisYear = new Date().getFullYear();
    conditions.push("YEAR(s.created_at) = ?");
    params.push(thisYear);
  }

  if (plant && plant !== "all") {
    conditions.push("s.plant_name = ?");
    params.push(plant);
  }

  const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";

  const summarySql = `
    SELECT 
      COUNT(*) AS total_items,
      SUM(CASE WHEN i.status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed_items,
      SUM(CASE WHEN i.status = 'Not Confirmed' THEN 1 ELSE 0 END) AS not_confirmed_items,
      SUM(CASE WHEN i.status = 'Not Confirmed' AND (i.is_resolved = 0 OR i.is_resolved IS NULL)
          AND (i.action_taken IS NULL OR TRIM(i.action_taken) = '') THEN 1 ELSE 0 END) AS open_items,
      SUM(CASE WHEN i.status = 'Not Confirmed' AND (i.is_resolved = 0 OR i.is_resolved IS NULL)
          AND (i.action_taken IS NOT NULL AND TRIM(i.action_taken) <> '') THEN 1 ELSE 0 END) AS in_progress_items,
      SUM(CASE WHEN i.status = 'Not Confirmed' AND i.is_resolved = 1 THEN 1 ELSE 0 END) AS closed_items
    FROM audit_items i
    JOIN audit_sessions s ON i.session_id = s.id
    ${where}
  `;

  db.query(summarySql, params, (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to fetch summary" });
    const summary = result[0] || {};

    const totalAuditsSql = `SELECT COUNT(*) AS total_audits FROM audit_sessions s ${where}`;
    db.query(totalAuditsSql, params, (err2, res2) => {
      if (err2) return res.status(500).json({ error: "Failed to fetch audit count" });
      summary.total_audits = res2 && res2[0] ? res2[0].total_audits : 0;
      res.json(summary);
    });
  });
});

// --------------------------------------------------
// 🔵 Monthly Audit Status (Supports plant filter)
// --------------------------------------------------
app.get("/api/monthly-status", (req, res) => {
  const plant = req.query.plant;
  const params = [];
  let where = "";

  if (plant && plant !== "all") {
    where = " WHERE s.plant_name = ?";
    params.push(plant);
  }

  const sql = `
    SELECT 
      MONTH(s.created_at) AS month,
      SUM(CASE WHEN i.status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed,
      SUM(CASE WHEN i.status = 'Not Confirmed' THEN 1 ELSE 0 END) AS not_confirmed
    FROM audit_sessions s
    LEFT JOIN audit_items i ON s.id = i.session_id
    ${where}
    GROUP BY MONTH(s.created_at)
    ORDER BY MONTH(s.created_at)
  `;

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to fetch monthly status" });
    res.json(result);
  });
});

// --------------------------------------------------
// 🔵 Department Status (Supports month & plant filters)
// --------------------------------------------------
app.get("/api/department-status", (req, res) => {
  const month = req.query.month;
  const plantParam = req.query.plant || "all";

  const categoriesSubquery = `
    SELECT 'Quality' AS category
    UNION ALL SELECT 'Safety'
    UNION ALL SELECT 'Maintenance'
    UNION ALL SELECT '5S'
    UNION ALL SELECT 'Shop Floor Management'
    UNION ALL SELECT 'Others'
  `;

  let sql = "";
  const params = [];

  if (month && month !== "all" && month !== "year") {
    const [yStr, mStr] = month.split("-");
    const year = parseInt(yStr, 10);
    const monthNum = parseInt(mStr, 10);

    sql = `
      SELECT c.category AS department,
        COALESCE(SUM(CASE WHEN i.status = 'Not Confirmed' 
            AND (? = 'all' OR s.plant_name = ?) 
            AND YEAR(s.created_at) = ? AND MONTH(s.created_at) = ? THEN 1 ELSE 0 END),0) AS not_confirmed,
        COALESCE(SUM(CASE WHEN (? = 'all' OR s.plant_name = ?) 
            AND YEAR(s.created_at) = ? AND MONTH(s.created_at) = ? THEN 1 ELSE 0 END),0) AS total_items
      FROM (${categoriesSubquery}) c
      LEFT JOIN audit_items i ON i.category = c.category
      LEFT JOIN audit_sessions s ON i.session_id = s.id
      GROUP BY c.category
    `;
    params.push(plantParam, plantParam, year, monthNum, plantParam, plantParam, year, monthNum);

  } else if (month === "year") {
    const thisYear = new Date().getFullYear();
    sql = `
      SELECT c.category AS department,
        COALESCE(SUM(CASE WHEN i.status = 'Not Confirmed' 
            AND (? = 'all' OR s.plant_name = ?) 
            AND YEAR(s.created_at) = ? THEN 1 ELSE 0 END),0) AS not_confirmed,
        COALESCE(SUM(CASE WHEN (? = 'all' OR s.plant_name = ?) 
            AND YEAR(s.created_at) = ? THEN 1 ELSE 0 END),0) AS total_items
      FROM (${categoriesSubquery}) c
      LEFT JOIN audit_items i ON i.category = c.category
      LEFT JOIN audit_sessions s ON i.session_id = s.id
      GROUP BY c.category
    `;
    params.push(plantParam, plantParam, thisYear, plantParam, plantParam, thisYear);

  } else {
    sql = `
      SELECT c.category AS department,
        COALESCE(SUM(CASE WHEN i.status = 'Not Confirmed' 
            AND (? = 'all' OR s.plant_name = ?) THEN 1 ELSE 0 END), 0) AS not_confirmed,
        COALESCE(SUM(CASE WHEN (? = 'all' OR s.plant_name = ?) THEN 1 ELSE 0 END), 0) AS total_items
      FROM (${categoriesSubquery}) c
      LEFT JOIN audit_items i ON i.category = c.category
      LEFT JOIN audit_sessions s ON i.session_id = s.id
      GROUP BY c.category
    `;
    params.push(plantParam, plantParam, plantParam, plantParam);
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Department status error:", err);
      return res.status(500).json({ error: "Failed to fetch department status" });
    }
    res.json(result);
  });
});

// --------------------------------------------------
// 🔵 Action Points (Supports month & plant filters)
// --------------------------------------------------
// -----------------------------
// ✅ Action Points (updated for 7-column Role-Wise Action table)
// Supports ?month=YYYY-MM | year | all | plant=Delhi/Parwanoo/Pune/Chennai
// -----------------------------
// ==============================
// ✅ ACTION POINTS (FINAL VERSION)
// ==============================
app.get("/api/action-points", (req, res) => {
  const month = req.query.month; // e.g., "2025-10", "year", or "all"
  const plant = req.query.plant || "all"; // optional filter for plant
  let where = `WHERE i.status = 'Not Confirmed'`;
  const params = [];

  // --- Month/year filters ---
  if (month && month !== "all" && month !== "year") {
    const [yStr, mStr] = month.split("-");
    const year = parseInt(yStr, 10);
    const monthNum = parseInt(mStr, 10);
    where += ` AND YEAR(s.created_at) = ? AND MONTH(s.created_at) = ?`;
    params.push(year, monthNum);
  } else if (month === "year") {
    const thisYear = new Date().getFullYear();
    where += ` AND YEAR(s.created_at) = ?`;
    params.push(thisYear);
  }

  // --- Plant filter ---
  if (plant && plant !== "all") {
    where += ` AND s.plant_name = ?`;
    params.push(plant);
  }

  // --- Query ---
  const sql = `
    SELECT 
      s.role,
      s.employee_id,
      s.plant_name,
      s.value_stream,
      s.shift_time,
      s.created_at AS date_of_assessment,
      i.id AS item_id,
      i.question AS assessment_point,
      i.category AS department,
      i.comment AS comment,
      i.action_taken AS action,
      CASE 
        WHEN i.is_resolved = 1 THEN i.updated_at
        ELSE NULL
      END AS implementation_date,
      CASE 
        WHEN i.is_resolved = 1 THEN 'Closed'
        WHEN i.action_taken IS NOT NULL AND TRIM(i.action_taken) <> '' THEN 'In Progress'
        ELSE 'Open'
      END AS status
    FROM audit_items i
    JOIN audit_sessions s ON i.session_id = s.id
    ${where}
    ORDER BY s.created_at DESC
  `;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Action points error:", err);
      return res.status(500).json({ error: "Failed to fetch action points" });
    }
    res.json(result);
  });
});


// --------------------------------------------------
// 🔵 Save Auditee Action (without resolving)
// --------------------------------------------------
app.post("/api/saveAction", (req, res) => {
  const { id, action } = req.body;

  if (!id || !action) {
    return res.status(400).json({ success: false, message: "Item ID and action are required" });
  }

  const sql = `
    UPDATE audit_items 
    SET action_taken = ? 
    WHERE id = ? AND (is_resolved = 0 OR is_resolved IS NULL)
  `;

  db.query(sql, [action, id], (err, result) => {
    if (err) {
      console.error("❌ MySQL error while saving action:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.json({ success: false, message: "Cannot update — item may already be resolved" });
    }

    res.json({ success: true, message: "Action saved successfully" });
  });
});

// ------------------------------------------------

app.post('/api/lpa-calendar', async (req, res) => {
  try {
    const { plant, month, year, data } = req.body;
    const [result] = await dbPromise.query(
      'REPLACE INTO lpa_calendar (plant, month, year, data_json) VALUES (?, ?, ?, ?)',
      [plant, month, year, JSON.stringify(data)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ LPA Calendar Save Error:", err);
    res.status(500).json({ error: "Failed to save LPA calendar" });
  }
});

app.get('/api/lpa-calendar', async (req, res) => {
  try {
    const { plant, month, year } = req.query;
    const [rows] = await dbPromise.query(
      'SELECT data_json FROM lpa_calendar WHERE plant=? AND month=? AND year=? LIMIT 1',
      [plant, month, year]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(JSON.parse(rows[0].data_json));
  } catch (err) {
    console.error("❌ LPA Calendar Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch LPA calendar" });
  }
});

// --------------------------------------------------
// 🔵 Send LPA Calendar Emails
// --------------------------------------------------


// ============================================================
// 📧 API: Send LPA Calendar Email with PROPER Calendar Excel
// ============================================================
app.post("/api/send-lpa-calendar-mail", async (req, res) => {
  try {
    const { plant, month, year, data } = req.body;
    const uploadedData = data?.uploadedData || {};
    const emails = new Set();

    // Collect recipients
    const allRoles = [
      ...(uploadedData.valueStreamLeaders || []),
      ...(uploadedData.customerQualityEngineers || []),
      ...(uploadedData.plantHODs || []),
      ...(uploadedData.crossFunctionalTeams || []),
    ];
    allRoles.forEach((p) => p.email && emails.add(p.email));
    if (emails.size === 0) return res.status(400).json({ error: "No emails found" });

    // ============================================================
    // 📊 Generate Professional Excel (Calendar Layout)
    // ============================================================
    const safePlant = (plant || "Plant").replace(/\s+/g, "_");
    const fileName = `LPA_Calendar_${safePlant}_${month}_${year}.xlsx`;
    const excelPath = path.join("/tmp", fileName); // Render-safe storage


    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${month} ${year}`);

    const assignments = data?.assignments || [];
    const daysInMonth = new Date(year, new Date(`${month} 1, ${year}`).getMonth() + 1, 0).getDate();

    // ============================================================
    // 🟦 HEADER LAYOUT (Row1 = Month, Row2 = Dates, Row3 = Day Names)
    // ============================================================
    const totalCols = daysInMonth + 1; // 1 for 'Line'
    const lastColLetter = sheet.getColumn(totalCols).letter;

    // Row 1 — Big merged Month Name
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = sheet.getCell("A1");
    titleCell.value = `${month.toUpperCase()} ${year}`;
    titleCell.font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0077B6" } };
    sheet.getRow(1).height = 30;

    // Row 2 — Date Numbers
    const dateRow = sheet.getRow(2);
    dateRow.getCell(1).value = "Line";
    for (let d = 1; d <= daysInMonth; d++) {
      dateRow.getCell(d + 1).value = d;
    }

    // Row 3 — Day Names
    const dayRow = sheet.getRow(3);
    dayRow.getCell(1).value = "";
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(`${month} ${d}, ${year}`);
      const dayName = date.toLocaleDateString("en", { weekday: "short" });
      dayRow.getCell(d + 1).value = dayName;
    }

    // Style for header rows
    [2, 3].forEach((r) => {
      const row = sheet.getRow(r);
      row.eachCell((cell, col) => {
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF00B4D8" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFBBBBBB" } },
          left: { style: "thin", color: { argb: "FFBBBBBB" } },
          bottom: { style: "thin", color: { argb: "FFBBBBBB" } },
          right: { style: "thin", color: { argb: "FFBBBBBB" } },
        };
      });
    });

    // Make Sunday columns red in header
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(`${month} ${d}, ${year}`);
      const dayName = date.toLocaleDateString("en", { weekday: "short" });
      if (dayName === "Sun") {
        dateRow.getCell(d + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF4D4D" } };
        dayRow.getCell(d + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF4D4D" } };
      }
    }

    // ============================================================
    // 📅 Fill Calendar Rows (Lines × Days)
    // ============================================================
    const allLines = [...new Set(assignments.map((a) => a.line))].sort();

    const roleColors = {
      "Value Stream Leader": "FFB7E4C7", // green
      "CFT Member": "FFE2C2FF", // purple
      "Customer Quality Engineer": "FFB3D9FF", // blue
      "Plant Head": "FFFFCC99", // orange
    };

    const sundayFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFCCCC" } };

    allLines.forEach((line, i) => {
      const row = sheet.getRow(i + 4); // start from row 4
      row.getCell(1).value = line;
      row.getCell(1).font = { bold: true };
      row.height = 20;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(`${month} ${d}, ${year}`);
        const dayName = date.toLocaleDateString("en", { weekday: "short" });
        const dateStr = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const cell = row.getCell(d + 1);
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

        if (dayName === "Sun") {
          cell.value = "Holiday";
          cell.fill = sundayFill;
          cell.font = { color: { argb: "FFB00020" }, bold: true, italic: true };
          continue;
        }

        const found = assignments.filter((a) => a.date === dateStr && a.line === line);
        if (found.length > 0) {
          const auditor = found.map((a) => a.manager).join(", ");
          const type = found[0].type;
          const color = roleColors[type] || "FFFFFFFF";
          cell.value = auditor;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
        }
      }

      // Borders for all data cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFDDDDDD" } },
          left: { style: "thin", color: { argb: "FFDDDDDD" } },
          bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
          right: { style: "thin", color: { argb: "FFDDDDDD" } },
        };
      });
    });

    // ============================================================
    // 🧊 Freeze top 3 rows + first column
    // ============================================================
    sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 3 }];

    // Set widths
    sheet.getColumn(1).width = 28;
    for (let i = 2; i <= totalCols; i++) sheet.getColumn(i).width = 10;

    // ============================================================
    // 🗂️ Add Legend at bottom
    // ============================================================
    const legendStart = allLines.length + 6;
    sheet.getRow(legendStart).values = ["Legend:"];
    sheet.getRow(legendStart + 1).values = [
      "🟩 Value Stream Leader",
      "🟪 CFT Member",
      "🟦 Customer Quality Engineer",
      "🟧 Plant Head",
      "🟥 Sunday - Holiday",
    ];

    // Save Excel file
    await workbook.xlsx.writeFile(excelPath);
    console.log(`📊 Excel generated at: ${excelPath}`);

    // ============================================================
    // ✉️ Send Email with Attachment
    // ============================================================
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "aayushrajiaf1404@gmail.com",
        pass: "lhvq ggfm ztga ktub", // Gmail App Password
      },
    });

    const mailOptions = {
      from: '"LPA Calendar System" <aayushrajiaf1404@gmail.com>',
      to: [...emails],
      subject: `LPA Calendar – ${plant} (${month} ${year})`,
      html: `
        <p>Dear Team,</p>
        <p>Your <b>LPA Calendar</b> for <b>${plant}</b> (${month} ${year}) has been generated successfully.</p>
        <p>Attached is the calendar in Excel format.</p>
        <p>🗓️ <b>Features:</b> Month header, day numbers, weekday labels, Sundays marked as Holiday.</p>
        <p><b>Color Key:</b> 🟩 VSL, 🟪 CFT, 🟦 CQE, 🟧 PH, 🟥 Sunday</p>
        <br><p>Regards,<br><b>LPA System</b></p>
      `,
      attachments: [{ filename: fileName, path: excelPath }],
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Sent Excel to: ${[...emails].join(", ")}`);

    res.json({ success: true, file: fileName, sentTo: [...emails] });
  } catch (err) {
    console.error("❌ Mail send error:", err);
    res.status(500).json({ error: "Mail failed", details: err.message });
  }
});



// 🔹 DOWNLOAD LPA EXCEL — Always regenerate latest file
app.get("/api/download-lpa-excel/:plant/:month/:year", async (req, res) => {
  try {
    const { plant, month, year } = req.params;
    const filePath = path.join("/tmp", `LPA_Calendar_${plant}_${month}_${year}.xlsx`);

    // 🔹 Get latest data from database
    const [rows] = await dbPromise.query(
      "SELECT data_json FROM lpa_calendar WHERE plant=? AND month=? AND year=? LIMIT 1",
      [plant, month, year]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "No calendar found" });
    }

    const data = JSON.parse(rows[0].data_json);

    // 🔹 Generate fresh Excel file for download
    await generateLpaExcelForDownload(plant, month, year, data, filePath);

    return res.download(filePath, `LPA_Calendar_${plant}_${month}_${year}.xlsx`);
  } catch (err) {
    console.error("❌ Download Error:", err);
    return res.status(500).json({ error: "Download failed" });
  }
});
// 🔧 Helper: Generate Excel for Download Only
async function generateLpaExcelForDownload(plant, month, year, data, excelPath) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`${month} ${year}`);

  const assignments = data?.assignments || [];
  const daysInMonth = new Date(year, new Date(`${month} 1, ${year}`).getMonth() + 1, 0).getDate();

  sheet.getRow(1).getCell(1).value = `${plant} – ${month} ${year}`;
  sheet.getRow(1).font = { bold: true };
  
  for (let i = 1; i <= daysInMonth; i++) {
    sheet.getRow(2).getCell(i + 1).value = i;
  }

  await workbook.xlsx.writeFile(excelPath);
  console.log("📁 Download Excel created:", excelPath);
}



// --------------------------------------------------
// Serve Frontend + Start Server (FINAL)
// --------------------------------------------------

// ===============================
// 📌 STATIC FILE SERVING FOR FRONTEND
// ===============================
// Serve frontend from /public (FINAL)
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api/")) {
    return res.sendFile(path.join(publicPath, "index.html"));
  }
  next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
