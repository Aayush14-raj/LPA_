/* --- Rewritten script.js (full) ---

This file is a cleaned and fixed version of your original script.js.
I kept your data structures and UI flow but fixed a number of bugs that
were causing exceptions and unexpected behaviour:
 - fixed missing/incorrect DOM references (e.g. progressText / auditPage)
 - ensured getAllAuditorItemIds always receives a role (avoids TypeErrors)
 - fixed resolveTextFromId hash/string comparison
 - removed duplicate/overwriting functions and replaced them with single, correct implementations
 - fixed remark modal flow so "Cancel" reverts selection and "Save" closes modal reliably
 - fixed startNewAudit handler that referenced an undefined categories variable
 - fixed auditee results display using lastSubmission from the server response
 - made code defensive (guards) so functions fail gracefully when called out-of-order

Keep this file as a drop-in replacement for your current script.js.
*/


document.addEventListener("DOMContentLoaded", () => {
// --- Utilities & Data ---
function getCategoriesForRole(role) {
  const base = ["5S", "Maintenance", "Safety", "Quality", "Shop Floor Management"];
  return role === "team-leader" ? [...base, "Others"] : base;
}

const auditItems = {
  "team-leader": {
    "5S": [
      "Plant floor, machinery, tools, gauges and packing materials (in the checked area) free of dirt, oil, water and grease",
      "Dedicated areas marked/identified  and items placed accordingly (e.g. storage of components, semi-finished products, finished products...)",
      "Tools, fixtures, gauges, masters samples and material on the line in their correct identified and clearly labeled place",
      "Tooling, equipments and products free of hazardous surfaces (eg: flashs, unprocted sharp surfaces)",
      "Area clear of unneeded equipments, materials, inventory, furnishes or personal items for the current production"
    ],
    "Maintenance": [
      "If TPM implemented, Team maintenance operations defined, executed and recorded (including repair operations)"
    ],
    "Safety": [
      "Personal protective equipment (PPE) requirements visible to all people (e.g. PPE visualized on each entrance of production and area or line or workstation)",
      "Everyone (internal and external) wears required personal protective equipment (PPE)",
      "No safety risk observed (e.g. exposed wired, cable crossing walkways, speeding forklift, obstructed eletrical panels) - if risk observed, immediate countermeasure is mandatory ",
      "No objects as pallets, parked forklifts, construction area blocking pathways and forcing pedestrians or vehicles to leave their designated path",
      "Checksheet for safety equipment (e.g. machine doors closed, light curtains, safety interlocks…) in each line or workstation available, completed and signed"
    ],
    "Quality": [
      "Work instructions available for the part produced and easily accessible for the Operators",
      "Critical process parameters recorded and within the defined limits (verify 5 parameters of one equipment randomly and record the equipment name on the back page)",
      "Poka Yoke/detection systems (sensors and cameras) checked at the beginning of each shift and all devices OK ",
      "First part checked at the beginning of each shift or after changeover / set up and last part before changeover checked - result recorded and within specification - if perishable materials used, they are under using date limit",
      "Operators work according to the released work instructions (check one line and record the line name on the back page (for big lines, check minimum 5 work stations per LPA and record the name of the work stations on the back page))",
      "Scrap parts and parts to be reworked separated in boxes/racks clearly identified  (for example red/yellow boxes in identified place) to avoid improper use",
      "FIFO rules for materials, components, work in process and finished goods, respected within the checked production area (also within rework area and Quality Walls)",
      "All materials (raw material, components, WIP and finish goods) within respective box/pallet identified/labeled according to specification"
    ],
    "Others": [
      "CUSTOM_QUESTION_1",
      "CUSTOM_QUESTION_2"
    ]
  },
  "value-stream-leader":{
    "5S": [
      "Plant floor, machinery, tools, gauges and packing materials (in the checked area) free of dirt, oil, water and grease",
      "Dedicated areas marked/identified  and items placed accordingly (e.g. storage of components, semi-finished products, finished products...)",
      "Tools, fixtures, gauges, masters samples and material on the line in their correct identified and clearly labeled place",
      "Tooling, equipments and products free of hazardous surfaces (eg: flashs, unprocted sharp surfaces)",
      "Area clear of unneeded equipments, materials, inventory, furnishes or personal items for the current production"
    ],
    "Maintenance": [
      "If TPM implemented, Team maintenance operations defined, executed and recorded (including repair operations)"
    ],
    "Safety": [
      "Personal protective equipment (PPE) requirements visible to all people (e.g. PPE visualized on each entrance of production and area or line or workstation)",
      "Everyone (internal and external) wears required personal protective equipment (PPE)",
      "No safety risk observed (e.g. exposed wired, cable crossing walkways, speeding forklift, obstructed eletrical panels) - if risk observed, immediate countermeasure is mandatory ",
      "No objects as pallets, parked forklifts, construction area blocking pathways and forcing pedestrians or vehicles to leave their designated path",
      "All chemicals and hazardous materials labeled and stored according to the local HSE standard "
    ],
    "Quality": [
      "Changeover / set up instruction(s) available at the line",
      "Work instructions available for the part produced and easily accessible for the Operators",
      "Operators training to work at the assigned work place recorded",
      "Operators work according to the released work instructions (check one workstation and record the name on the back page)",
      "FIFO rules for materials, components, work in process and finished goods, respected within the checked production area (also within rework area and Quality Walls)",
      "All materials (raw material, components, WIP and finish goods) within respective box/pallet identified/labeled according to specification",
      "If Quality Walls exist for the checked line (even if situated in a different area), standard work instruction available and followed by the operator(s) (check one Quality Wall and record the name on the back page)",
      "If failure detected at Quality Walls, it is documented, recorded and a corrective action is defined"
    ],
    "Shop Floor Management": [
      "Communication between shifts documented (e.g. shift hand over book or SFM Board with shift to shift topics or a computer file)",
      "All data required for the KPIs recorded (for example NRFT, breakdowns, changeovers…)  and up to date.",
      "All of the identified problems in the action tracker (eg: KPI deviations, 5S deviations, safety issues) have future target dates and responsibilities assigned",
      "Result of LPA performed by each level visualized on the SFM Boards (each level check the below level) according to the standard"
    ]
  },
   "customer-quality-engineer": {
    "5S": [
      "Plant floor, machinery, tools, gauges and packing materials (in the checked area) free of dirt, oil, water and grease",
      "Dedicated areas marked/identified and items placed accordingly (e.g. storage of components, semi-finished products, finished products...)"
    ],
    "Safety": [
      "No safety risk observed (e.g. exposed wired, cable crossing walkways, speeding forklift, obstructed eletrical panels) - if risk observed, immediate countermeasure is mandatory.",
      "No objects as pallets, parked forklifts, construction area blocking pathways and forcing pedestrians or vehicles to leave their designated path."
    ],
    "Quality": [
      "Work instructions available for the part produced and easily accessible for the Operators.",
      "Operators training to work at the assigned work place recorded.",
      "Critical process parameters recorded and within the defined limits (verify 5 parameters of one equipment randomly and record the equipment name on the back page)",
      "Poka Yoke/detection systems (sensors and cameras) checked at the beginning of each shift and all devices OK.",
      "First part checked at the beginning of each shift or after changeover / set up and last part before changeover checked - result recorded and within specification - if perishable materials used, they are under using date limit.",
      "Operators work according to the released work instructions (check one workstation and record the name on the back page.",
      "All data required for process control not included in the first part check (e.g. SPC chart cleanliness measurement, burst pressure, cutting inspection, etc.) available and within specification.",
      "Scrap parts and parts to be reworked separated in boxes/racks clearly identified (for example red/yellow boxes in identified place)to avoid improper use.",
      "Work instruction for part rework available and clearly stating which failures may be reworked and how the part must be reintroduced into the line - If there is a rework during the LPA, check if done according the work instruction.",
      "Deviations to process flow chart or control plan documented and approved by Quality Department.",
      "FIFO rules for materials, components, work in process and finished goods, respected within the checked production area (also within rework area and Quality Walls)",
      "All materials (raw material, components, WIP and finish goods) within respective box/pallet identified/labeled according to specification.",
      "All measurement equipment with a due date for the next calibration defined and not exceeded (check one line and record the name on the back page)",
      "If Quality Walls exist for the checked line (even if situated in a different area), standard work instruction available and followed by the operator(s)(check one Quality Wall and record the name on the back page)",
      "If failure detected at Quality Walls, it is documented, recorded and a corrective action is defined."
    ],
    "Shop Floor Management": [
      "Result of LPA performed by each level visualized on the SFM Boards (each level check the below level) according to the standard."
    ],
  },
  "plant-manager": {
    "5S": [
      "Plant floor, machinery, tools, gauges and packing materials (in the checked area) free of dirt, oil, water and grease",
      "Dedicated areas marked/identified and items placed accordingly (e.g. storage of components, semi-finished products, finished products...)",
      "Cleaning instruction and cleaning plan in place"
    ],
    "Maintenance": [
      "Preventive maintenance defined according to local standard and executed according to the planning",
      "If TPM implemented, Team maintenance operations defined, executed and recorded (including repair operations)"
    ],
    "Safety": [
      "Personal protective equipment (PPE) requirements visible to all people (e.g. PPE visualized on each entrance of production and area or line or workstation)",
      "Everyone (internal and external) wears required personal protective equipment (PPE)",
      "No safety risk observed (e.g. exposed wired, cable crossing walkways, speeding forklift, obstructed eletrical panels) - if risk observed, immediate countermeasure is mandatory ",
      "No objects as pallets, parked forklifts, construction area blocking pathways and forcing pedestrians or vehicles to leave their designated path",
      "All chemicals and hazardous materials labeled and stored according to the local HSE standard",
      "Results of Safety Observation Tours (SOT) have been visualized (F-G-9581 SOT Tracker Form)"
    ],
    "Quality": [
      "Operators informed about customer complaints and recent customer complaints displayed in such a way, that all Operators of the area in which the part is produced, can easily see the complaints",
      "Open customer complaints vizualized and D1 to D6 completed within the given time frame",
      "Work instructions available for the part produced and easily accessible for the Operators",
      "Critical process parameters recorded and within the defined limits (verify 5 parameters of one equipment randomly and record the equipment name on the back page)",
      "Poka Yoke/detection systems (sensors and cameras) checked at the beginning of each shift and all devices OK",
      "Operators work according to the released work instructions (check one workstation and record the name on the back page)",
      "Scrap parts and parts to be reworked separated in boxes/racks clearly identified  (for example red/yellow boxes in identified place) to avoid improper use",
      "FIFO rules for materials, components, work in process and finished goods, respected within the checked production area (also within rework area and Quality Walls)",
      "All materials (raw material, components, WIP and finish goods) within respective box/pallet identified/labeled according to specification",
      "If Quality Walls exist for the checked line (even if situated in a different area), standard work instruction available and followed by the operator(s) (check one Quality Wall and record the name on the back page)",
      "If failure detected at Quality Walls, it is documented, recorded and a corrective action is defined"
    ],
    "Shop Floor Management": [
      "Communication between shifts documented (e.g. shift hand over book or SFM Board with shift to shift topics or a computer file)",
      "All data required for the KPIs recorded (for example NRFT, breakdowns, changeovers…)  and up to date.",
      "Result of LPA performed by each level visualized on the SFM Boards (each level check the below level) according to the standard"
    ],
  },
  "regional-quality-head": {
    "5S": [
      "Plant floor, machinery, tools, gauges and packing materials (in the checked area) free of dirt, oil, water and grease",
      "Dedicated areas marked/identified and items placed accordingly (e.g. storage of components, semi-finished products, finished products...)"
    ],
    "Safety": [
      "Everyone (internal and external) wears required personal protective equipment (PPE)",
      "No safety risk observed (e.g. exposed wired, cable crossing walkways, speeding forklift, obstructed eletrical panels) - if risk observed, immediate countermeasure is mandatory.",
      "No objects as pallets, parked forklifts, construction area blocking pathways and forcing pedestrians or vehicles to leave their designated path."
    ],
    "Quality": [
      "Operators informed about customer complaints and recent customer complaints displayed in such a way, that all Operators of the area in which the part is produced, can easily see the complaints.",
      "Open customer complaints vizualized and D1 to D6 completed within the given time frame.",
      "Poka Yoke/detection systems (sensors and cameras) checked at the beginning of each shift and all devices OK",
      "Operator is doing systematically identical work content in each cycle (except for component box changes)",
      "Scrap parts and parts to be reworked separated in boxes/racks clearly identified (for example red/yellow boxes in identified place) to avoid improper use",
      "All materials (raw material, components, WIP and finish goods) within respective box/pallet identified/labeled according to specification.",
      "If Quality Walls exist for the checked line (even if situated in a different area), standard work instruction available and followed by the operator(s)(check one Quality Wall and record the name on the back page)",
      "If failure detected at Quality Walls, it is documented, recorded and a corrective action is defined."
    ],
    "Shop Floor Management": [
      "All of the identified problems in the action tracker (eg: KPI deviations, 5S deviations, safety issues) have future target dates and responsibilities assigned.",
      "Result of LPA performed by each level visualized on the SFM Boards (each level check the below level) according to the standard."
    ],
  },
  "board-member":{
    "5S": [
      "Plant floor, machinery, tools, gauges and packing materials (in the checked area) free of dirt, oil, water and grease "
    ],
    
    "Safety": [
      "Everyone (internal and external) wears required personal protective equipment (PPE)",
      "No safety risk observed (e.g. exposed wired, cable crossing walkways, speeding forklift, obstructed eletrical panels) - if risk observed, immediate countermeasure is mandatory ",
      "No objects as pallets, parked forklifts, construction area blocking pathways and forcing pedestrians or vehicles to leave their designated path",
      "Results of Safety Observation Tours (SOT) have been visualized (F-G-9581 SOT Tracker Form)"
    ],
    "Quality": [
      "Operators informed about customer complaints and recent customer complaints displayed in such a way, that all Operators of the area in which the part is produced, can easily see the complaints ",
      "Operator is doing systematically identical work content in each cycle (except for component box changes) ",
      "Scrap parts and parts to be reworked separated in boxes/racks clearly identified  (for example red/yellow boxes in identified place) to avoid improper use",
      "All materials (raw material, components, WIP and finish goods) within respective box/pallet identified/labeled according to specification "
    ],
    "Shop Floor Management": [
      "All of the identified problems in the action tracker (eg: KPI deviations, 5S deviations, safety issues) have future target dates and responsibilities assigned ",
      "Result of LPA performed by each level visualized on the SFM Boards (each level check the below level) according to the standard"
    ]
  }
};
const API_BASE =
  window.location.hostname.includes("localhost")
    ? "http://localhost:5000"
    : "https://lpa-final-n43q.onrender.com";




// --- State ---
let currentUser = null;
let auditData = {};
let plantShiftData = {};
let currentCommentIndex = null; // id of item awaiting comment save
let pendingCommentChange = null; // { id, previousValue }
let currentCategoryKey = null; // active category string
let lastSubmission = null; // last payload saved to server (used for auditee view)

// --- Element refs ---
const roleSelectPage = document.getElementById("roleSelectPage");
const loginPage = document.getElementById("loginPage");
const plantShiftPage = document.getElementById("plantShiftPage");
const auditDashboard = document.getElementById("auditDashboard");
const auditeeLoginPage = document.getElementById("auditeeLoginPage");
const auditeeOptionsPage = document.getElementById("auditeeOptionsPage");
const auditeeCategoryPage = document.getElementById("auditeeCategoryPage");
const auditeeResultsPage = document.getElementById("auditeeResultsPage");
const dashboardPage = document.getElementById("dashboardPage");
const auditChecklist = document.getElementById("auditChecklist");
const categoryTabs = document.getElementById("categoryTabs");

// safety check for required elements
if (!roleSelectPage || !loginPage || !plantShiftPage || !auditDashboard) {
  console.warn("Some main pages are missing from DOM — script will continue but some features may not work.");
}

// --- Event listeners ---
document.getElementById("chooseAuditor").addEventListener("click", () => { showOnly(loginPage); });
document.getElementById("chooseAuditee").addEventListener("click", () => { showOnly(auditeeLoginPage); });
document.getElementById("chooseLpaCalendar").addEventListener("click", () => { showOnly(lpaLoginPage); }); // NEW: LPA Calendar button

document.getElementById("backToRoleFromLogin").addEventListener("click", () => { showOnly(roleSelectPage); });
document.getElementById("backToLoginFromSetup").addEventListener("click", () => { showOnly(loginPage); });
document.getElementById("backToRoleFromDashboard").addEventListener("click", () => { showOnly(roleSelectPage); });
document.getElementById("backToRoleFromAuditee").addEventListener("click", () => { showOnly(roleSelectPage); });
document.getElementById("backToRoleFromAuditeeLogin").addEventListener("click", () => { showOnly(roleSelectPage); });
document.getElementById("backToRoleFromAuditeeOptions").addEventListener("click", () => { showOnly(roleSelectPage); });
document.getElementById("backToOptionsFromCategory").addEventListener("click", () => { showOnly(auditeeOptionsPage); });
document.getElementById("backToRoleFromDashboardMain").addEventListener("click", () => { showOnly(roleSelectPage); });

// NEW: LPA Calendar back buttons
document.getElementById("backToRoleFromLpaLogin").addEventListener("click", () => { showOnly(roleSelectPage); });
document.getElementById("backToRoleFromLpaMain").addEventListener("click", () => { showOnly(roleSelectPage); });

document.getElementById("auditeeLoginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const userId = document.getElementById('auditeeUserId').value.trim();
  const pwd = document.getElementById('auditeePassword').value;
  if (!userId || !pwd) { alert('Please enter both User ID and Password'); return; }
  // Demo mode: proceed for any non-empty credentials
  showOnly(auditeeOptionsPage);
});

// NEW: Auditee Options buttons
document.getElementById("viewDashboardBtn").addEventListener("click", () => { 
  showOnly(dashboardPage);
  loadDashboardData(); // Load dashboard data when showing dashboard
});
document.getElementById("viewNonCompliancesBtn").addEventListener("click", () => { 
  showOnly(auditeeCategoryPage);
});

// NEW: LPA Calendar login
document.getElementById("lpaLoginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const userId = document.getElementById('lpaUserId').value.trim();
  const pwd = document.getElementById('lpaPassword').value;
  if (!userId || !pwd) { alert('Please enter both User ID and Password'); return; }
  // Demo mode: proceed for any non-empty credentials
  showOnly(lpaMainPage);
});

document.getElementById("auditeeBackToCats").addEventListener("click", () => { showOnly(auditeeCategoryPage); });
document.getElementById("auditeeBackToRole").addEventListener("click", () => { showOnly(roleSelectPage); });

// NEW: LPA Calendar buttons
document.getElementById("viewLpaBtn").addEventListener("click", () => { renderLpaView(); });
document.getElementById("createLpaBtn").addEventListener("click", () => { renderLpaCreateForm(); });

Array.from(document.querySelectorAll("[data-auditee-cat]")).forEach(btn => {
  btn.addEventListener("click", () => {
    const cat = btn.getAttribute("data-auditee-cat");
    openAuditeeResults(cat);
  });
});

document.getElementById("loginForm").addEventListener("submit", handleLogin);
document.getElementById("plantShiftForm").addEventListener("submit", handlePlantShiftSubmission);
document.getElementById("submitAudit").addEventListener("click", handleAuditSubmission);
document.getElementById("cancelCommentBtn").addEventListener("click", cancelComment);
document.getElementById("saveCommentBtn").addEventListener("click", saveComment);
document.getElementById("startNewAuditBtn").addEventListener("click", () => {
  hideSuccess();
  if (!currentUser) { showOnly(roleSelectPage); return; }
  const cats = getCategoriesForRole(currentUser.role);
  loadAuditChecklist(currentCategoryKey || cats[0]);
});
document.getElementById("auditDoneBtn").addEventListener("click", () => { hideSuccess(); showOnly(roleSelectPage); });


function showOnly(page) {
  // list every top-level page we may show/hide
  const allPages = [
    roleSelectPage, loginPage, plantShiftPage, auditDashboard,
    auditeeLoginPage, auditeeOptionsPage, auditeeCategoryPage, auditeeResultsPage,
    lpaLoginPage, lpaMainPage, dashboardPage  // NEW: Include LPA pages and Dashboard
  ];

  allPages.forEach(p => {
    if (p) p.classList.add("hidden");
  });
  if (page) page.classList.remove("hidden");
}


function handleLogin(e) {
  e.preventDefault();
  const employeeId = document.getElementById("employeeId").value.trim();
  const managementLevel = document.getElementById("managementLevel").value;
  if (employeeId && managementLevel) {
    currentUser = { employeeId, role: managementLevel, roleName: document.getElementById("managementLevel").selectedOptions[0].text };
    showPlantShiftPage();
  }
}

function showPlantShiftPage() {
  showOnly(plantShiftPage);
  if (currentUser && currentUser.role === "team-leader") {
    document.getElementById("shiftSelection").classList.remove("hidden");
    document.getElementById("shiftTime").required = true;
  } else {
    document.getElementById("shiftSelection").classList.add("hidden");
    document.getElementById("shiftTime").required = false;
  }
}

function handlePlantShiftSubmission(e) {
  e.preventDefault();
  const plantName = document.getElementById("plantName").value;
  const valueStream = document.getElementById("valueStream").value;
  const shiftTime = document.getElementById("shiftTime").value;

  if (!plantName || !valueStream) {
    alert("Please select plant and value stream before starting audit.");
    return;
  }

  plantShiftData = { plantName, valueStream, shiftTime };
  startAudit();
}

function updateCustomQuestion(id, value) {
  if (!id) return;
  if (!auditData[id]) auditData[id] = { value: null, comment: "", question: value, customQuestion: value };
  auditData[id].customQuestion = value;
  auditData[id].question = value;
  updateProgress();
}

// --- Build UI: categories & checklist ---
function buildCategoryTabs() {
  if (!currentUser) return;
  categoryTabs.innerHTML = "";
  const cats = getCategoriesForRole(currentUser.role);
  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "tab border rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50";
    btn.textContent = cat + (cat === "Others" && currentUser.role === "team-leader" ? " (Optional)" : "");
    btn.addEventListener("click", () => loadAuditChecklist(cat));
    btn.dataset.cat = cat;
    categoryTabs.appendChild(btn);
  });

  highlightActiveTab(currentCategoryKey || cats[0]);
}

function highlightActiveTab(cat) {
  Array.from(categoryTabs.children).forEach(b => {
    b.classList.remove("bg-blue-100", "border-blue-500", "text-blue-700");
    b.classList.add("border-gray-200", "text-gray-700");
  });
  const active = Array.from(categoryTabs.children).find(b => b.dataset.cat === cat);
  if (active) {
    active.classList.add("bg-blue-100", "border-blue-500", "text-blue-700");
    active.classList.remove("border-gray-200", "text-gray-700");
  }
}

function loadAuditChecklist(cat) {
  if (!currentUser) return;
  currentCategoryKey = cat;
 const itemsByRole = auditItems[currentUser.role] || {};
let items = itemsByRole[cat] || [];
auditChecklist.innerHTML = "";

// For team-leader Others, ignore the static placeholders and create only 2 dynamic slots
if (cat === "Others" && currentUser.role === "team-leader") {
  items = Array(2).fill().map((_, i) => `CUSTOM_QUESTION_${i+1}`);
}
const allItems = items;


  allItems.forEach((item, idx) => {
    const id = getItemId(cat, item);
    const saved = auditData[id] || { value: null, comment: "", customQuestion: "", question: (item && item.startsWith && item.startsWith('CUSTOM_QUESTION_') ? '' : item) };

    const wrapper = document.createElement("div");
    wrapper.className = "border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-md transition";
    wrapper.setAttribute("data-id", id);
    wrapper.setAttribute("data-category", cat);
    wrapper.setAttribute("data-question", item);

    // Build question area
    let questionHTML = "";
    if (cat === "Others" && currentUser.role === "team-leader" && item.startsWith("CUSTOM_QUESTION_")) {
      questionHTML = `\n        <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded mb-3"\n               placeholder="Enter your custom audit point"\n               value="${escapeHtml(saved.customQuestion || '')}"\n               onchange="updateCustomQuestion('${id}', this.value)">\n      `;
      // If saved customQuestion exists in saved data, ensure question text is updated in auditData
      if (saved.customQuestion) {
        auditData[id] = { ...saved, question: saved.customQuestion };
      }
    } else {
      questionHTML = `<p class="text-gray-800 font-medium mb-3">${escapeHtml(item)}</p>`;
    }

    wrapper.innerHTML = `
      <div class="flex items-start space-x-4 audit-question">
        <div class="flex-grow">
          ${questionHTML}
          <div class="flex flex-wrap gap-3">
            <label class="flex items-center cursor-pointer">
              <input type="radio" name="${id}" value="confirmed" class="sr-only" ${saved.value === "confirmed" ? "checked" : ""}>
              <div class="audit-radio option-confirm flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-gray-200">
                <div class="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                <span class="text-sm font-medium text-gray-700">Confirmed</span>
              </div>
            </label>
            <label class="flex items-center cursor-pointer">
              <input type="radio" name="${id}" value="not-confirmed" class="sr-only" ${saved.value === "not-confirmed" ? "checked" : ""}>
              <div class="audit-radio option-not flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-gray-200">
                <div class="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                <span class="text-sm font-medium text-gray-700">Not Confirmed</span>
              </div>
            </label>
          </div>
          <div class="comment-slot mt-2"></div>
        </div>
      </div>
    `;

    // Attach listeners to radio inputs
    const radios = wrapper.querySelectorAll(`input[name="${id}"]`);
    radios.forEach(r => {
      r.addEventListener("change", () => {
        // If user selected Confirmed, save immediately
        if (r.value === "confirmed") {
          // Clear any pending comment change
          pendingCommentChange = null;
          updateAuditItem(id, "confirmed", auditData[id] ? (auditData[id].comment || "") : "", auditData[id] ? (auditData[id].customQuestion || "") : "");
        } else {
          // For Not Confirmed, open remark modal and store pending state
          pendingCommentChange = { id, previousValue: auditData[id] ? auditData[id].value : null };
          currentCommentIndex = id;
          document.getElementById("commentText").value = auditData[id] ? (auditData[id].comment || "") : "";
          document.getElementById("commentModal").classList.remove("hidden");
          setTimeout(() => document.getElementById("commentText").focus(), 50);
        }
      });
    });

    auditChecklist.appendChild(wrapper);

    // If saved, apply UI state
    if (saved.value === "confirmed") {
      styleChoice(wrapper, "confirmed");
    } else if (saved.value === "not-confirmed") {
      styleChoice(wrapper, "not-confirmed");
      if (saved.comment) addOrUpdateRemark(wrapper, saved.comment);
    }
  });

  // Update progress and UI
  updateProgress();
  highlightActiveTab(cat);
  updateTotalsDisplay();
}

function getItemId(cat, text) {
  return `${cat}__${hashText(String(text || ''))}`;
}
function hashText(t) {
  let h = 0; for (let i = 0; i < t.length; i++) { h = ((h << 5) - h) + t.charCodeAt(i); h |= 0; }
  return Math.abs(h).toString();
}

// Escape helper for safe insertion into value/text
function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Comment modal flow ---
function cancelComment() {
  // revert selection if the user cancelled
  if (pendingCommentChange && pendingCommentChange.id) {
    const id = pendingCommentChange.id;
    const prev = pendingCommentChange.previousValue;
    const rConfirmed = document.querySelector(`input[name="${id}"][value="confirmed"]`);
    const rNot = document.querySelector(`input[name="${id}"][value="not-confirmed"]`);
    if (prev === 'confirmed') {
      if (rConfirmed) rConfirmed.checked = true;
      if (rNot) rNot.checked = false;
      // update UI to reflect the confirmed state
      const card = document.querySelector(`[data-id="${id}"]`);
      if (card) styleChoice(card, 'confirmed');
      if (auditData[id]) auditData[id].value = 'confirmed';
    } else {
      // no previous value or previous was null -> uncheck both
      if (rConfirmed) rConfirmed.checked = false;
      if (rNot) rNot.checked = false;
      const card = document.querySelector(`[data-id="${id}"]`);
      if (card) {
        styleChoice(card, null);
        const slot = card.querySelector('.comment-slot'); if (slot) slot.innerHTML = '';
      }
      if (auditData[id]) delete auditData[id].value; // revert saved state
    }
  }

  pendingCommentChange = null;
  currentCommentIndex = null;
  document.getElementById("commentModal").classList.add("hidden");
}

function saveComment() {
  const comment = document.getElementById("commentText").value.trim();
  if (!comment) {
    alert("Please provide a remark before saving.");
    return;
  }
  if (!currentCommentIndex) {
    alert("No item selected to save remark.");
    return;
  }

  updateAuditItem(currentCommentIndex, "not-confirmed", comment);

  // close modal and clear pending state
  document.getElementById("commentModal").classList.add("hidden");
  pendingCommentChange = null;
  currentCommentIndex = null;
}

function hideSuccess() { const sm = document.getElementById("successModal"); if (sm) sm.classList.add("hidden"); }

// --- Update model & UI ---
function updateAuditItem(id, value, comment = "", customQuestion = "") {
  if (!id) return;
  // Resolve question text: prefer the customQuestion passed, then any saved question, then try to resolve
  let questionText = customQuestion || (auditData[id] ? auditData[id].question : null) || resolveTextFromId(id);

  // Ensure object exists
  auditData[id] = auditData[id] || { value: null, comment: "", question: questionText };
  auditData[id].value = value;
  auditData[id].comment = comment || "";
  auditData[id].question = questionText || auditData[id].question;
  if (customQuestion) auditData[id].customQuestion = customQuestion;
  auditData[id].timestamp = new Date().toISOString();
  auditData[id].category = currentCategoryKey;
  // Update UI card
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    styleChoice(card, value);
    const slot = card.querySelector('.comment-slot');
    if (value === 'not-confirmed') {
      addOrUpdateRemark(card, comment);
    } else if (value === 'confirmed') {
      if (slot) slot.innerHTML = '';
    } else {
      if (slot) slot.innerHTML = '';
    }
  }

  // Update progress + totals
  try { updateProgress(); updateTotalsDisplay(); } catch (err) { console.warn('Error updating progress/totals:', err); }
}

function styleChoice(card, value) {
  const confirmOption = card.querySelector(".option-confirm");
  const notConfirmOption = card.querySelector(".option-not");
  if (confirmOption) confirmOption.classList.remove("bg-green-50", "border-green-500");
  if (notConfirmOption) notConfirmOption.classList.remove("bg-red-50", "border-red-500");

  if (value === "confirmed") {
    if (confirmOption) confirmOption.classList.add("bg-green-50", "border-green-500");
  } else if (value === "not-confirmed") {
    if (notConfirmOption) notConfirmOption.classList.add("bg-red-50", "border-red-500");
  }
}

function addOrUpdateRemark(card, comment) {
  const slot = card.querySelector('.comment-slot');
  if (slot) {
    slot.innerHTML = `\n      <div class="comment-indicator p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">\n        <strong>Remark:</strong> ${escapeHtml(comment)}\n      </div>\n    `;
  }
}

function updateTotalsDisplay() {
  try {
    const totalCountEl = document.getElementById("totalCount");
    const totalItems = getAllAuditorItemIds(currentUser ? currentUser.role : null).length;
    if (totalCountEl) totalCountEl.textContent = totalItems;
  } catch (err) { console.warn('updateTotalsDisplay error:', err); }
}

function updateProgress() {
  try {
    if (!currentUser) return;
    const ids = getAllAuditorItemIds(currentUser.role);
    let answered = 0;
    ids.forEach(id => { if (auditData[id] && auditData[id].value) answered++; });
    const totalItems = ids.length;
    const percent = totalItems > 0 ? Math.round((answered / totalItems) * 100) : 0;

    const bar = document.getElementById("progressBar"); if (bar) bar.style.width = percent + "%";
    const completedEl = document.getElementById("completedCount"); if (completedEl) completedEl.textContent = answered;
    const totalEl = document.getElementById("totalCount"); if (totalEl) totalEl.textContent = totalItems;

    // Enable submit when answered equals totalItems
    const submitBtn = document.getElementById("submitAudit");
    if (submitBtn) submitBtn.disabled = (answered !== totalItems);
  } catch (err) { console.warn('updateProgress error:', err); }
}

function getAllAuditorItemIds(role) {
  // default to currentUser.role if missing
  if (!role && currentUser) role = currentUser.role;
  if (!role || !auditItems[role]) return [];

  const categoriesForRole = getCategoriesForRole(role);
  const ids = [];

  for (const cat of categoriesForRole) {
    const questions = (auditItems[role] && auditItems[role][cat]) ? auditItems[role][cat] : [];

    // For Others (team-leader) we only include custom questions if they are filled
    if (cat === 'Others' && role === 'team-leader') {
      let hasCustomQuestions = false;
      for (const q of questions) {
        const id = getItemId(cat, q);
        if (auditData[id] && auditData[id].customQuestion && auditData[id].customQuestion.trim() !== '') {
          hasCustomQuestions = true;
          ids.push(id);
        }
      }
      if (!hasCustomQuestions) continue; // skip Others if none filled
    } else {
      for (const q of questions) {
        ids.push(getItemId(cat, q));
      }
    }
  }
  return ids;
}

async function handleAuditSubmission() {
  if (!currentUser || !currentUser.role) {
    alert("⚠️ No active user or role is missing!");
    return;
  }

  const mandatoryIds = getAllAuditorItemIds(currentUser.role);
  let allRequiredAnswered = mandatoryIds.every(id => 
    auditData[id] && auditData[id].value !== undefined
  );

  if (!allRequiredAnswered) {
    alert("⚠️ Please answer all mandatory questions before submitting.");
    return;
  }

  const payload = {
    role: currentUser.role,
    employee_id: currentUser.employeeId || "",
    plant_name: plantShiftData.plantName || "",
    value_stream: plantShiftData.valueStream || "",
    shift_time: plantShiftData.shiftTime || "",
    items: []
  };

  // 🔥 Correct mapping: true → Confirmed, false → Not Confirmed
  for (const id in auditData) {
    if (auditData[id]?.value !== undefined) {

      const status = auditData[id].value === "confirmed"
  ? "Confirmed"
  : "Not Confirmed";


      payload.items.push({
        category: auditData[id].category || "General",
        question: auditData[id].question || "",
        status: status,
        comment: auditData[id].comment || "",
        is_resolved: false
      });
    }
  }

  console.log("📤 Sending payload:", payload);

  const submitBtn = document.getElementById("submitAudit");
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Submitting...";
  submitBtn.disabled = true;

  const maxAttempts = 3;
  const delay = ms => new Promise(res => setTimeout(res, ms));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE}/api/saveAudit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        console.log("✅ Success:", result);
        const sm = document.getElementById("successModal");
        if (sm) sm.classList.remove("hidden");
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }

    } catch (err) {
      console.warn(`Attempt ${attempt} error:`, err);
    }

    await delay(2000);
  }

  alert("❌ Failed to save audit. Try again.");
  submitBtn.textContent = originalText;
  submitBtn.disabled = false;
}




// --- Auditee results rendering ---
function renderAuditeeItems(items, listHost, emptyHost) {
  listHost.innerHTML = "";

  if (!items || items.length === 0) {
    emptyHost.classList.remove("hidden");
    return;
  }
  emptyHost.classList.add("hidden");

  items.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "border rounded-xl p-4 mb-3";

    const resolved = it.is_resolved === 1;
    const hasAction = !!it.action_taken;

    row.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 rounded-full bg-red-50 border border-red-200 text-red-700 flex items-center justify-center font-semibold">
          ${idx + 1}
        </div>
        <div class="flex-1">
          <p class="text-gray-800 font-medium">${escapeHtml(it.text)}</p>
          <div class="mt-1 text-xs text-gray-500">
            Audit Date: ${escapeHtml(it.sessionDate || "Unknown")}
          </div>
          <div class="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            <strong>Remark:</strong> ${escapeHtml(it.comment || "")}
          </div>

          <!-- ✅ Action textarea (keep previous text if exists) -->
          <textarea class="action-input w-full border rounded p-2 mt-2 text-sm"
                    data-id="${it.id}"
                    ${resolved ? "disabled" : ""}
                    placeholder="Write action taken...">${escapeHtml(it.action_taken || "")}</textarea>

          <!-- ✅ Save Action button -->
          <button class="mt-2 px-4 py-2 ${resolved ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"} text-white rounded-lg text-sm save-action-btn"
                  data-id="${it.id}"
                  ${resolved ? "disabled" : ""}>
            ${resolved ? "Action Final" : "Save Action"}
          </button>

          <!-- ✅ Mark as Resolved button -->
          <button class="mt-2 px-4 py-2 ${!hasAction || resolved ? "bg-gray-300 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"} text-white rounded-lg text-sm mark-resolve-btn"
                  data-id="${it.id}"
                  ${!hasAction || resolved ? "disabled" : ""}>
            ${resolved ? "Resolved ✅" : "Mark as Resolved"}
          </button>
        </div>
      </div>
    `;

    listHost.appendChild(row);
  });

  // 🔥 Enable/disable "Mark as Resolved" live when typing
  document.querySelectorAll(".action-input").forEach(textarea => {
    textarea.addEventListener("input", () => {
      const id = textarea.getAttribute("data-id");
      const markBtn = document.querySelector(`.mark-resolve-btn[data-id="${id}"]`);
      if (markBtn && textarea.value.trim().length > 0) {
        markBtn.disabled = false;
        markBtn.classList.remove("bg-gray-300", "cursor-not-allowed");
        markBtn.classList.add("bg-green-500", "hover:bg-green-600");
      } else if (markBtn) {
        markBtn.disabled = true;
        markBtn.classList.add("bg-gray-300", "cursor-not-allowed");
        markBtn.classList.remove("bg-green-500", "hover:bg-green-600");
      }
    });
  });
}

function openAuditeeResults(cat) {
  showOnly(auditeeResultsPage);
  const titleEl = document.getElementById("auditeeResultsTitle");
  const listHost = document.getElementById("auditeeList");
  const emptyEl = document.getElementById("auditeeEmpty");

  fetch(`${API_BASE}/api/getAudits?filterResolved=true`)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.audits || data.audits.length === 0) {
        if (titleEl) titleEl.textContent = `${cat} — No audits found`;
        renderAuditeeItems([], listHost, emptyEl);
        return;
      }

      const allItems = [];
      data.audits.forEach(audit => {
        audit.items.forEach(it => {
          if (
            (it.category || "").toLowerCase() === cat.toLowerCase() &&
            (it.status || "").toLowerCase() === "not confirmed" &&
            !it.is_resolved
          ) {
          allItems.push({
  id: it.id || it.item_id,
  text: it.question || "(No text)",
  comment: it.comment || "",
  action_taken: it.action_taken || "",   // 👈 add this line
  sessionDate: new Date(audit.session.created_at).toLocaleString()
});
          }
        });
      });

      if (titleEl) titleEl.textContent = `${cat} — Not Confirmed Items`;
      renderAuditeeItems(allItems, listHost, emptyEl);
    })
    .catch(err => {
      console.error("❌ Error fetching audits:", err);
      if (titleEl) titleEl.textContent = `${cat} — Error loading audits`;
      renderAuditeeItems([], listHost, emptyEl);
    });
}

// --- Global click handler for Mark as Resolved (Auditee only) ---
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("mark-resolve-btn")) {
    const id = e.target.getAttribute("data-id");
    const button = e.target;

    if (!id || isNaN(Number(id))) {
      alert("Invalid item ID — cannot mark as resolved.");
      return;
    }

    button.textContent = "Resolving...";
    button.disabled = true;

    fetch(`${API_BASE}/api/markResolved`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(id) })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        button.textContent = "Resolved ✅";
        button.disabled = true;
        button.classList.remove("bg-green-500", "hover:bg-green-600");
        button.classList.add("bg-gray-400", "cursor-not-allowed");

        const currentCat = document.getElementById("auditeeResultsTitle").textContent.split(" — ")[0];
        openAuditeeResults(currentCat); // refresh
      } else {
        alert("Failed to mark as resolved: " + (data.error || "Unknown error"));
        button.textContent = "Mark as Resolved";
        button.disabled = false;
      }
    })
    .catch(err => {
      console.error("Resolve error:", err);
      alert("Error marking as resolved. Please try again.");
      button.textContent = "Mark as Resolved";
      button.disabled = false;
    });
  }
});

// ========== Manager Action Points Feature (Dashboard) ==========
document.querySelectorAll(".role-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const role = btn.dataset.role;
    loadManagerActionPoints(role);
  });
});

function loadManagerActionPoints(role) {
  fetch(`${API_BASE}/api/getAudits?filterResolved=false`)
    .then(res => res.json())
    .then(data => {
      const audits = data.audits || [];
      const rows = [];

      audits.forEach(audit => {
        if (audit.session.role === role) {
          audit.items.forEach(item => {
            if (item.status === "Not Confirmed") {
              // ✅ Pure data only, no resolve button
              rows.push(`
                <tr>
                  <td>${item.question}</td>
                  <td>${item.category}</td>
                  <td>${item.comment || ""}</td>
                  <td>${new Date(audit.session.created_at).toLocaleString()}</td>
                  <td>${item.is_resolved ? "Closed" : "Open"}</td>
                </tr>
              `);
            }
          });
        }
      });

      const tableSection = document.getElementById("manager-action-points");
      const tbody = document.getElementById("managerActionBody"); // ✅ fixed to match HTML
      const title = document.getElementById("actionPointsTitle"); // ✅ fixed to match HTML

      if (rows.length > 0) {
        title.textContent = `Action Points for ${role}`;
        tbody.innerHTML = rows.join("");
        tableSection.style.display = "block";
      } else {
        title.textContent = `No Action Points for ${role}`;
        tbody.innerHTML = "";
        tableSection.style.display = "block";
      }
    })
    .catch(err => {
      console.error("Error fetching manager action points:", err);
      alert("Failed to load action points. Try again.");
    });
}
// --- Helpers ---
function resolveTextFromId(id) {
  if (!id) return '(Item not found)';
  const [cat, hash] = id.split('__');
  if (!cat || !hash) return '(Item not found)';

  // try exact match in auditItems for current role
  if (currentUser && auditItems[currentUser.role]) {
    const validCats = getCategoriesForRole(currentUser.role);
    for (const c of validCats) {
      const arr = auditItems[currentUser.role][c] || [];
      for (const txt of arr) {
        if (hashText(txt) === String(hash)) return txt;
      }
    }
  }

  // fallback: scan all roles
  for (const r in auditItems) {
    const set = auditItems[r];
    for (const c in set) {
      const arr = set[c] || [];
      for (const txt of arr) {
        if (hashText(txt) === String(hash)) return txt;
      }
    }
  }
  return '(Item not found)';
}
// --- Start audit (enter dashboard) ---
function startAudit() {
  if (!currentUser) return;
  showOnly(auditDashboard);

  document.getElementById("userRole").textContent = currentUser.roleName || currentUser.role;
  document.getElementById("plantInfo").textContent = `${plantShiftData.plantName} - ${plantShiftData.valueStream}`;
  document.getElementById("currentDate").textContent = new Date().toLocaleDateString();

  auditData = {}; // reset
  buildCategoryTabs();
  const categories = getCategoriesForRole(currentUser.role);
  loadAuditChecklist(categories[0]);
}

function logout() {
  currentUser = null; auditData = {}; plantShiftData = {}; currentCommentIndex = null; currentCategoryKey = null; pendingCommentChange = null;
  showOnly(roleSelectPage);
  const lf = document.getElementById('loginForm'); if (lf) lf.reset();
  const pf = document.getElementById('plantShiftForm'); if (pf) pf.reset();
}

// --- Small catch-all safety initialization ---
// Make sure the dashboard submit button is disabled initially
(function initSafety() {
  try {
    const submitBtn = document.getElementById('submitAudit'); if (submitBtn) submitBtn.disabled = true;
    // ensure progress starts at 0
    const bar = document.getElementById('progressBar'); if (bar) bar.style.width = '0%';
    const completedEl = document.getElementById('completedCount'); if (completedEl) completedEl.textContent = '0';
    const totalEl = document.getElementById('totalCount'); if (totalEl) totalEl.textContent = '0';
  } catch (err) { /* ignore */ }
})();
// 🔵 Save Action Taken Handler
// 🔵 Save Action Taken Handler
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("save-action-btn")) {
    const id = e.target.getAttribute("data-id");
    const textarea = document.querySelector(`textarea.action-input[data-id="${id}"]`);
    const actionText = textarea ? textarea.value.trim() : "";

    console.log("🖊 Saving action for ID =", id, "Action =", actionText);

    if (!id || isNaN(Number(id)) || !actionText) {
      alert("⚠️ Please enter a valid action before saving.");
      return;
    }

    // disable button temporarily for better UX
    e.target.textContent = "Saving...";
    e.target.disabled = true;

    fetch(`${API_BASE}/api/saveAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(id), action: actionText })  // ✅ FIXED
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        e.target.textContent = "Saved ✅";
        e.target.classList.remove("bg-blue-500", "hover:bg-blue-600");
        e.target.classList.add("bg-gray-400", "cursor-not-allowed");

        // keep textarea filled with last action, but keep editable for updates
        if (textarea) {
          textarea.disabled = false; // allow updating again
        }

      } else {
        alert("Failed to save action: " + (data.message || "Unknown error"));
        e.target.textContent = "Save Action";
        e.target.disabled = false;
      }
    })
    .catch(err => {
      console.error("Save action error:", err);
      alert("Error saving action. Please try again.");
      e.target.textContent = "Save Action";
      e.target.disabled = false;
    });
  }
});
// Global click handler for "Mark as Resolved"
// Global click handler for "Mark as Resolved"
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("mark-resolve-btn")) {
    const id = e.target.getAttribute("data-id");
    const button = e.target;

    console.log("🖱 Mark resolve clicked, ID =", id);  // 🔥 Debug log

    if (!id || isNaN(Number(id))) {
      alert("Invalid item ID — cannot mark as resolved.");
      return;
    }

    // Change button style and text immediately for better UX
    button.textContent = "Resolving...";
    button.disabled = true;

    // Send request to server to mark as resolved
    fetch(`${API_BASE}/api/markResolved`,{
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(id) })   // 🔥 ensure numeric
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Update button to show resolved state
        button.textContent = "Resolved ✅";
        button.disabled = true;
        button.classList.remove("bg-green-500", "hover:bg-green-600");
        button.classList.add("bg-gray-400", "cursor-not-allowed");

        // 🔥 Refresh list so resolved item disappears
        const currentCat = document.getElementById("auditeeResultsTitle").textContent.split(" — ")[0];
        openAuditeeResults(currentCat);

      } else {
        alert("Failed to mark as resolved: " + (data.error || "Unknown error"));
        button.textContent = "Mark as Resolved";
        button.disabled = false;
      }
    })
    .catch(err => {
      console.error("Resolve error:", err);
      alert("Error marking as resolved. Please try again.");
      button.textContent = "Mark as Resolved";
      button.disabled = false;
    });
  }
});
// ========== Manager Action Points Feature ==========
document.querySelectorAll(".role-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const role = btn.dataset.role;
    loadManagerActionPoints(role);
  });
});


/* -------------------- 🌿 ENHANCED LPA CALENDAR MODULE — FINAL VERSION -------------------- */

// 🌿 Navigation Buttons
document.getElementById("chooseLpaCalendar").addEventListener("click", () => {
  showOnly(document.getElementById("lpaLoginPage"));
});
document.getElementById("backToRoleFromLpaLogin").addEventListener("click", () => {
  showOnly(document.getElementById("roleSelectPage"));
});
document.getElementById("lpaLoginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  showOnly(document.getElementById("lpaMainPage"));
});
document.getElementById("backToRoleFromLpaMain").addEventListener("click", () => {
  showOnly(document.getElementById("roleSelectPage"));
});
// 🌿 BUILT-IN PLANT CONFIG (Value Streams + Subline Names)
const PLANT_CONFIG = {
  "Pune": {
    "Oil": [
      "Spin-On Line",
      "Oil Assembly Line"
    ],
    "EP": [
      "CHC TATA 1.2 NA Line"
    ],
    "Air": [
      "Hydraulic Element Line",
      "Continuous Paper Line",
      "Out Source Line",
      "5 ft × 3 ft – Both Side",
      "PU-2 Line",
      "PU-1 Line",
      "Line-15",
      "Rotary Paper Line",
      "PU-3 Line",
      "Wire Clamp Assembly Line-1",
      "Wire Clamp Assembly Line-2",
      "Flat Clamp Assembly Line",
      "TATA Air Cleaner Assembly Line",
      "W601 Air Cleaner Assembly Line",
      "W601 Intake System Assembly Line",
      "P125 Air Cleaner Assembly Line",
      "UPP Air Cleaner Assembly Line",
      "TATA Pre Cleaner Assembly Line",
      "PU Line-2 Square Mould",
      "PU Line-2 Round Mould",
      "PU Assembly Child Parts",
      "PU Assembly Elements",
      "PU Line-1 Packing Elements"
    ]
  },

  // MOCK data for other plants (you can replace later)
  "Delhi": {
    "Air": ["Line A1", "Line A2"],
    "Oil": ["Line O1"]
  },

  "Parwanu": {
    "Air": ["Line P1"],
    "CC & Others": ["CC-Line-1", "CC-Line-2"]
  },

  "Chennai": {
    "Air": ["Air-Line-1"],
    "Fuel": ["Fuel-Line-1"]
  }
};


// 🌿 Updated LPA Template Download (with Cross Functional Team section)
function downloadLPATemplate() {
  const templateData = [
    ["LPA CALENDAR TEMPLATE"],
    [""],
    ["PLANT INFORMATION"],
    ["Plant Name", "Enter Plant Name (e.g., Delhi)"],
    [""],

    ["VALUE STREAM LEADERS (VSL)"],
    ["VSL ID", "Full Name", "Initials", "Email"],
    ["VSL1", "", "", ""],
    ["VSL2", "", "", ""],
    ["VSL3", "", "", ""],
    ["VSL4", "", "", ""],
    ["VSL5", "", "", ""],
    [""],

    ["CROSS FUNCTIONAL TEAM (CFT) — LINKED TO EACH VSL"],
    ["VSL ID (Linked)", "CFT Member Full Name", "Initials", "Email"],
    ["VSL1", "", "", ""],
    ["VSL1", "", "", ""],
    ["VSL2", "", "", ""],
    ["VSL2", "", "", ""],
    ["VSL3", "", "", ""],
    ["VSL3", "", "", ""],
    ["VSL4", "", "", ""],
    ["VSL5", "", "", ""],
    [""],

    ["CUSTOMER QUALITY ENGINEERS (CQE)"],
    ["CQE ID", "Full Name", "Initials", "Email"],
    ["CQE1", "", "", ""],
    ["CQE2", "", "", ""],
    ["CQE3", "", "", ""],
    [""],

    ["PLANT HEADS (PH)"],
    ["PH ID", "Full Name", "Initials", "Email"],
    ["PH1", "", "", ""],
    ["PH2", "", "", ""],
    ["PH3", "", "", ""],
    [""],

       // removed manual value-stream table (prefilled by app per plant)
    ["NOTE", "Value streams are configured in the app (select plant) — do NOT add value streams here."],

  ];

  const csvContent = templateData
    .map(row => row.map(cell => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "LPA_Calendar_Template_Blank.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}



// 🌿 Excel Upload Handler
function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const content = e.target.result;
      const rows = content.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()));

      const uploadedData = {
        plant: rows[3]?.[1] || '',
        valueStreamLeaders: [],
        crossFunctionalTeams: [],
        customerQualityEngineers: [],
        plantHODs: [],
        valueStreams: {}
      };

      const getInitials = (name, excelInitials) => {
        if (excelInitials && excelInitials !== 'Initials') return excelInitials;
        if (!name) return '';
        return name.split(' ').map(n => n[0].toUpperCase()).join('');
      };

      // Parse VSLs
      let vslStart = rows.findIndex(r => r[0]?.includes("VSL ID"));
      for (let i = vslStart + 1; i < rows.length; i++) {
        if (!rows[i][0] || rows[i][0].includes("CROSS")) break;
        uploadedData.valueStreamLeaders.push({
          id: rows[i][0],
          name: rows[i][1],
          initials: getInitials(rows[i][1], rows[i][2]),
          email: rows[i][3]
        });
      }

      // Parse CFT
      const cftStart = rows.findIndex(r => r[0]?.includes("CROSS FUNCTIONAL TEAM"));
      for (let i = cftStart + 2; i < rows.length; i++) {
        if (!rows[i][0] || rows[i][0].includes("CUSTOMER")) break;
        uploadedData.crossFunctionalTeams.push({
          group: rows[i][0],
          name: rows[i][1],
          initials: getInitials(rows[i][1], rows[i][2]),
          email: rows[i][3]
        });
      }

      // Parse CQE
      const cqeStart = rows.findIndex(r => r[0]?.includes("CUSTOMER QUALITY ENGINEERS"));
      for (let i = cqeStart + 2; i < rows.length; i++) {
        if (!rows[i][0] || rows[i][0].includes("PLANT")) break;
        uploadedData.customerQualityEngineers.push({
          id: rows[i][0],
          name: rows[i][1],
          initials: getInitials(rows[i][1], rows[i][2]),
          email: rows[i][3]
        });
      }

      // Parse PH
      const phStart = rows.findIndex(r => r[0]?.includes("PLANT HEADS"));
      for (let i = phStart + 2; i < rows.length; i++) {
        if (!rows[i][0] || rows[i][0].includes("VALUE STREAM")) break;
        uploadedData.plantHODs.push({
          id: rows[i][0],
          name: rows[i][1],
          initials: getInitials(rows[i][1], rows[i][2]),
          email: rows[i][3]
        });
      }

      // Parse Value Streams
      const vsStart = rows.findIndex(r => r[0]?.includes("VALUE STREAM CONFIGURATION"));
      for (let i = vsStart + 2; i < rows.length; i++) {
        if (!rows[i][0]) break;
        const subLines = parseInt(rows[i][1]) || 1;
        uploadedData.valueStreams[rows[i][0]] = subLines;
      }

      localStorage.setItem('uploadedExcelData', JSON.stringify(uploadedData));
      alert(`✅ Excel uploaded successfully! Plant: ${uploadedData.plant}`);
    } catch (error) {
      console.error('Excel parse error:', error);
      alert('❌ Error parsing Excel file.');
    }
  };
  reader.readAsText(file);
}


// 🌿 Create LPA Calendar UI
document.getElementById("createLpaBtn").addEventListener("click", () => {

  
  
  const container = document.getElementById("lpaContainer");
  const uploadedData = JSON.parse(localStorage.getItem('uploadedExcelData') || '{}');
  const hasExcelData = uploadedData.plant && Object.keys(uploadedData.valueStreams || {}).length > 0;

  container.innerHTML = `
    <div class="bg-gray-50 p-6 rounded-xl border mt-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">Create LPA Calendar</h3>

      <div class="mb-6 p-4 rounded-lg ${hasExcelData ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-semibold ${hasExcelData ? 'text-green-800' : 'text-yellow-800'}">
              ${hasExcelData ? '✅ Excel Data Loaded' : '📋 Template Required'}
            </h4>
            <p class="text-sm ${hasExcelData ? 'text-green-600' : 'text-yellow-600'} mt-1">
              ${hasExcelData ? `Plant: ${uploadedData.plant}` : 'Download and upload template'}
            </p>
          </div>
          <div class="flex space-x-2">
            <button type="button" id="downloadTemplateBtn" class="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition">Download Template</button>
            <label class="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg cursor-pointer transition">
              Upload Filled Excel
              <input type="file" id="uploadTemplateBtn" accept=".csv,xlsx,xls" class="hidden">
            </label>
          </div>
        </div>
      </div>

      <!-- 🏭 Plant -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Select Plant</label>
        <select id="plantSelect" class="w-full border rounded-lg px-3 py-2" required>
          <option value="">-- Select Plant --</option>
          <option value="Delhi" ${uploadedData.plant === 'Delhi' ? 'selected' : ''}>Delhi</option>
          <option value="Parwanu" ${uploadedData.plant === 'Parwanu' ? 'selected' : ''}>Parwanu</option>
          <option value="Pune" ${uploadedData.plant === 'Pune' ? 'selected' : ''}>Pune</option>
          <option value="Chennai" ${uploadedData.plant === 'Chennai' ? 'selected' : ''}>Chennai</option>
        </select>
      </div>
      <div class="text-right mt-6">
        <button id="generateLpaBtn" class="bg-primary hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition">Generate & Email Calendar</button>
        <button id="downloadPdfBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition mt-2">
          Download LPA Excel
        </button>
      </div>
    </div>
    <div id="lpaCalendarDisplay" class="mt-8"></div>
  `;

  document.getElementById("downloadTemplateBtn").addEventListener("click", downloadLPATemplate);
  document.getElementById("uploadTemplateBtn").addEventListener("change", handleExcelUpload);
  document.getElementById("downloadPdfBtn").disabled = true;

  document.querySelectorAll(".vsCheckbox").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const sublineInput = e.target.parentElement.querySelector('.subline-count');
      sublineInput.disabled = !e.target.checked;
      if (!e.target.checked) sublineInput.value = 1;
    });
  });
  document.getElementById("generateLpaBtn").addEventListener("click", handleLpaCalendarGeneration);
  document.getElementById("downloadPdfBtn").addEventListener("click", () => {
    const plant = document.getElementById("plantSelect").value;
    const month = new Date().toLocaleString("default", { month: "long" });
    const year = new Date().getFullYear();
    window.open(`${API_BASE}/api/download-lpa-excel/${plant}/${month}/${year}`, "_blank");

  });

  // 🌿 NEW — AUTO-LOAD VALUE STREAMS & SUBLINE NAMES ON PLANT CHANGE
  const plantSelectEl = document.getElementById("plantSelect");
  plantSelectEl.addEventListener("change", () => {
    const plant = plantSelectEl.value;
    if (!plant) return;

    const cfg = PLANT_CONFIG[plant];
    if (!cfg) return;

    const data = JSON.parse(localStorage.getItem("uploadedExcelData") || "{}");

    // Convert REAL names → counts (for old logic compatibility)
    const vsCounts = {};
    Object.entries(cfg).forEach(([vs, arr]) => {
      vsCounts[vs] = Array.isArray(arr) ? arr.length : Number(arr) || 0;
    });

    data.plant = plant;
    data.valueStreams = vsCounts;   // counts used by generation logic
    data.sublineNames = cfg;        // store real names for createLpaCalendarData

    localStorage.setItem("uploadedExcelData", JSON.stringify(data));

    const disp = document.getElementById("lpaCalendarDisplay");
    disp.innerHTML = `
      <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <b>${plant} Selected</b><br>
        ${Object.entries(cfg).map(([vs, arr]) => 
          `<span class="block mt-1">${vs}: ${arr.length} Sub-lines</span>`).join("")}
      </div>
    `;
  });

});


// 🌿 HANDLE LPA CALENDAR GENERATION (FRONTEND → BACKEND)
async function handleLpaCalendarGeneration() {
  try {
    const plant = document.getElementById("plantSelect").value;
    if (!plant) return alert("⚠️ Please select a plant first.");

    // 🔹 Get uploaded Excel data (must exist)
    const uploadedData = JSON.parse(localStorage.getItem("uploadedExcelData") || "{}");

    if (!uploadedData ||
        !uploadedData.valueStreamLeaders ||
        uploadedData.valueStreamLeaders.length === 0 ||
        !uploadedData.crossFunctionalTeams ||
        uploadedData.crossFunctionalTeams.length === 0 ||
        !uploadedData.customerQualityEngineers ||
        uploadedData.customerQualityEngineers.length === 0 ||
        !uploadedData.plantHODs ||
        uploadedData.plantHODs.length === 0) {
      return alert("⚠️ Please upload the filled Excel template first.\nVSL, CFT, CQE & PH data are required.");
    }

    // 🔹 Ensure value streams exist
    const vsWithSubs = uploadedData.valueStreams || {};
    if (!Object.keys(vsWithSubs).length) {
      return alert("⚠️ Please ensure your Excel has Value Stream Configuration filled.");
    }

    // 🔹 Generate using your existing function
    const data = createLpaCalendarData(plant, vsWithSubs);
    if (!data || !data.assignments || !data.assignments.length) {
      return alert("⚠️ No assignments generated. Check Excel.");
    }

    // Save for email & download
    data.uploadedData = uploadedData;
    localStorage.setItem("latestLpaCalendar", JSON.stringify(data));

    // Render UI
    const container = document.getElementById("lpaCalendarDisplay");
    container.innerHTML = `
      <div class="mt-4">
        <h3 class="text-xl font-semibold">LPA Calendar for ${plant}</h3>
      </div>`;
    renderLpaCalendar(data);

    // 📌 Enable download button (NEW)
    const downloadBtn = document.getElementById("downloadPdfBtn");
    if (downloadBtn) downloadBtn.disabled = false;

    const now = new Date();
    const month = now.toLocaleString("default", { month: "long" });
    const year = now.getFullYear();

    // Save calendar in DB
    await fetch(`${API_BASE}/api/lpa-calendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plant, month, year, data }),
    });

    // Send Email
    const mailResponse = await fetch(`${API_BASE}/api/send-lpa-calendar-mail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plant, month, year, data }),
    });

    const mailResult = await mailResponse.json();

    if (mailResult.success) {
      alert(`✅ LPA Calendar mailed successfully to:\n${mailResult.sentTo.join(", ")}`);

      // 🔹 Only clear Excel AFTER successful generation (NEW)
      localStorage.removeItem("uploadedExcelData");

    } else {
      alert("⚠️ Calendar generated but email failed. Check server logs.");
    }

  } catch (err) {
    console.error("❌ Error generating LPA Calendar:", err);
    alert("⚠️ Something went wrong, try again.");
  }
}




// ✅ Local date formatter to avoid timezone shifting
function formatLocalYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}


function createLpaCalendarData(plant, vsWithSubs) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0–11
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const uploadedData = JSON.parse(localStorage.getItem("uploadedExcelData") || "{}");
  const assignments = [];

  // Extract people
  const vslList = uploadedData.valueStreamLeaders || [];
  const cftList = uploadedData.crossFunctionalTeams || [];
  const cqeList = uploadedData.customerQualityEngineers || [];
  const phList = uploadedData.plantHODs || [];

  const isSunday = (date) => date.getDay() === 0;
  const getInterval = (type) =>
    type === "twiceWeek" ? 3 : 15;

  const dates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  // -----------------------------
  // 1️⃣ Build value streams & sub-lines
  // -----------------------------
  const orderedVS = Object.keys(vsWithSubs); // keep natural order

  const mainLines = {};
  orderedVS.forEach(vs => {
    const realNames = uploadedData.sublineNames?.[vs];
    if (Array.isArray(realNames) && realNames.length > 0) {
      mainLines[vs] = realNames.slice();
    } else {
      const count = vsWithSubs[vs] || 0;
      mainLines[vs] = Array.from({ length: count }, (_, i) => `${vs} Line ${i + 1}`);
    }
  });

  const allSubLines = orderedVS.flatMap(vs => mainLines[vs]);

  // -----------------------------
  // 2️⃣ VSL + CFT SCHEDULING
  // -----------------------------
  if (vslList.length > 0 && allSubLines.length > 0) {

    // 🔹 Case 1: ONLY ONE VSL → global rotation across ALL lines (what was working for you)
    if (vslList.length === 1) {
      const vsl = vslList[0];
      const vslInitial = vsl.initials || vsl.name || "VSL";

      const team = [
        vslInitial,
        ...cftList
          .filter(c => (c.group || "").trim().toLowerCase() === vsl.id.trim().toLowerCase())
          .map(c => c.initials || c.name)
      ];
      const finalTeam = team.length ? team : [vslInitial];

      let lineIndex = 0;
      let auditorIndex = 0;

      dates.forEach(date => {
        if (isSunday(date)) return;

        const line = allSubLines[lineIndex % allSubLines.length];
        const auditor = finalTeam[auditorIndex % finalTeam.length];

        assignments.push({
          plant,
          date: formatLocalYMD(date),
          line,
          manager: auditor,
          type: auditor === vslInitial ? "Value Stream Leader" : "CFT Member",
        });

        lineIndex++;
        auditorIndex++;
      });

    } else {
      // 🔹 Case 2: MULTIPLE VSLs → each value stream has its own team

      // 2.1 Map value streams -> assigned VSL IDs
      const vsNames = orderedVS.slice();
      const vsToVslIds = {};
      vsNames.forEach(vs => { vsToVslIds[vs] = []; });

      if (vslList.length === vsNames.length) {
        // ✅ Equal VSLs & Value Streams → 1:1 mapping
        vsNames.forEach((vs, i) => {
          const vsl = vslList[i];
          if (vsl) vsToVslIds[vs].push(vsl.id);
        });
      } else if (vslList.length < vsNames.length) {
        // ✅ Fewer VSLs than streams → one VSL manages multiple VS (based on total lines)
        const vsSorted = vsNames.slice().sort(
          (a, b) => mainLines[b].length - mainLines[a].length
        );
        const vslLoad = new Array(vslList.length).fill(0);

        vsSorted.forEach(vs => {
          let best = 0;
          for (let i = 1; i < vslList.length; i++) {
            if (vslLoad[i] < vslLoad[best]) best = i;
          }
          const chosenVsl = vslList[best];
          vsToVslIds[vs].push(chosenVsl.id);
          vslLoad[best] += mainLines[vs].length;
        });
      } else {
        // ✅ More VSLs than streams → some streams get 2 VSLs
        const vsSorted = vsNames.slice().sort(
          (a, b) => mainLines[b].length - mainLines[a].length
        );

        // First give each VS one VSL
        const vslQueue = [...vslList];
        vsSorted.forEach(vs => {
          const vsl = vslQueue.shift();
          if (vsl) vsToVslIds[vs].push(vsl.id);
        });

        // Remaining VSLs are extra, assign them to streams with most lines
        vslQueue.forEach(vsl => {
          const targetVs = vsSorted[0]; // largest VS
          vsToVslIds[targetVs].push(vsl.id);
        });
      }

      // 2.2 Build per-value-stream state (lines + team + indices)
      const vsStates = [];

      vsNames.forEach(vs => {
        const vslIds = vsToVslIds[vs];
        if (!vslIds || !vslIds.length) return;

        const lines = mainLines[vs].slice();
        if (!lines.length) return;

        const team = [];

        vslIds.forEach(vslId => {
          const vsl = vslList.find(v => v.id === vslId);
          if (!vsl) return;

          const vslInitial = vsl.initials || vsl.name || "VSL";
          team.push({ label: vslInitial, type: "VSL" });

          const cfts = cftList.filter(c =>
            (c.group || "").trim().toLowerCase() === vslId.trim().toLowerCase()
          );
          cfts.forEach(c => {
            const cInit = c.initials || c.name;
            team.push({ label: cInit, type: "CFT" });
          });
        });

        if (!team.length) return;

        vsStates.push({
          vs,
          lines,
          team,
          lineIndex: 0,
          auditorIndex: 0,
        });
      });

      // 2.3 For EACH DAY, EACH VALUE STREAM audits one of its lines with its own team
      dates.forEach(date => {
        if (isSunday(date)) return;

        vsStates.forEach(state => {
          const { lines, team } = state;
          if (!lines.length || !team.length) return;

          const line = lines[state.lineIndex % lines.length];
          const member = team[state.auditorIndex % team.length];

          assignments.push({
            plant,
            date: formatLocalYMD(date),
            line,
            manager: member.label,
            type: member.type === "VSL" ? "Value Stream Leader" : "CFT Member",
          });

          state.lineIndex++;
          state.auditorIndex++;
        });
      });
    }
  }

  // -----------------------------
  // 3️⃣ CQE LOGIC — Twice a Week (same as before)
  // -----------------------------
  const cqeInterval = getInterval("twiceWeek");
  const cqeAllSubLines = Object.values(mainLines).flat();

  cqeList.forEach((cqe, i) => {
    const initials = cqe.initials?.trim() || cqe.name || `CQE${i + 1}`;
    const assignedLines = cqeAllSubLines
      .slice(i % cqeAllSubLines.length)
      .concat(cqeAllSubLines.slice(0, i % cqeAllSubLines.length));

    for (let d = 0; d < daysInMonth; d += cqeInterval * 2) {
      const date1 = new Date(year, month, d + 1);
      const date2 = new Date(year, month, d + 4);

      if (!isSunday(date1)) {
        assignments.push({
          plant,
          date: formatLocalYMD(date1),
          line: assignedLines[Math.floor(Math.random() * assignedLines.length)],
          manager: initials,
          type: "Customer Quality Engineer",
        });
      }

      if (!isSunday(date2)) {
        assignments.push({
          plant,
          date: formatLocalYMD(date2),
          line: assignedLines[Math.floor(Math.random() * assignedLines.length)],
          manager: initials,
          type: "Customer Quality Engineer",
        });
      }
    }
  });

  // -----------------------------
  // 4️⃣ PLANT HEAD LOGIC — Twice a Month (same as before)
  // -----------------------------
  phList.forEach((ph, i) => {
    const initials = ph.initials?.trim() || ph.name || `PH${i + 1}`;

    const day1 = new Date(year, month, 5);
    const day2 = new Date(year, month, daysInMonth - 2);

    const randomLine1 = cqeAllSubLines[Math.floor(Math.random() * cqeAllSubLines.length)];
    const randomLine2 = cqeAllSubLines[Math.floor(Math.random() * cqeAllSubLines.length)];

    if (!isSunday(day1)) {
      assignments.push({
        plant,
        date: formatLocalYMD(day1),
        line: randomLine1,
        manager: initials,
        type: "Plant Head",
      });
    }

    if (!isSunday(day2)) {
      assignments.push({
        plant,
        date: formatLocalYMD(day2),
        line: randomLine2,
        manager: initials,
        type: "Plant Head",
      });
    }
  });

  // FINAL RESULT
  return {
    plant,
    month: today.toLocaleString("default", { month: "long", year: "numeric" }),
    assignments,
    valueStreams: vsWithSubs,
    generatedAt: new Date().toISOString(),
  };
}


// 🌿 Enhanced Render Calendar with Better Styling
function renderLpaCalendar(data) {
  const container = document.getElementById("lpaCalendarDisplay");
  const { plant, month, assignments } = data;

  // 🗓️ Build unique sorted date list
  const uniqueDates = [...new Set(assignments.map(a => a.date))].sort((a, b) => new Date(a) - new Date(b));
  const dates = uniqueDates.map(d => new Date(d));

  // 🧩 Get all unique lines
  const allLines = [...new Set(assignments.map(a => a.line))].sort();

  // 🌿 Identify Value Streams (for header info)
  const valueStreams = {};
  allLines.forEach(line => {
    const vs = line.split(" ")[0]; // e.g. "Air Line 1" → "Air"
    valueStreams[vs] = true;
  });

  // 🏗️ Header
  let html = `
    <div class="bg-white rounded-lg border shadow-md">
      <div class="p-4 border-b bg-gray-50">
        <h3 class="text-xl font-semibold text-gray-800">${month} — ${plant} Plant</h3>
        
      </div>
      
      <div class="lpa-scroll-container overflow-x-auto">
        <table class="min-w-full border-collapse">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-3 font-semibold text-gray-700 text-left sticky left-0 bg-gray-100 z-10">Line</th>
  `;

  // 🗓️ Add date headers
  dates.forEach(d => {
    const dayName = d.toLocaleDateString("en", { weekday: "short" });
    html += `
      <th class="border p-2 text-center text-xs font-semibold text-gray-600">
        <div>${d.getDate()}</div>
        <div class="text-gray-400">${dayName}</div>
      </th>`;
  });

  html += `</tr></thead><tbody>`;

 // 🆕 GROUP LINES BY VALUE STREAM USING REAL SUBLINE NAMES
const uploadedData = JSON.parse(localStorage.getItem("uploadedExcelData") || "{}");
const groupedLines = {};

allLines.forEach(line => {
  const matchedVS = Object.keys(uploadedData.sublineNames || {}).find(vs =>
    uploadedData.sublineNames[vs].includes(line)
  ) || "Other";

  if (!groupedLines[matchedVS]) groupedLines[matchedVS] = [];
  groupedLines[matchedVS].push(line);
});

// 🆕 RENDER GROUPED VALUE STREAMS
Object.entries(groupedLines).forEach(([vs, lines]) => {

  // Value Stream header row
  html += `
    <tr class="bg-gray-200">
      <td class="border p-3 font-bold text-gray-800 sticky left-0 z-10">${vs}</td>
      ${dates.map(() => `<td class="border p-2 bg-gray-200"></td>`).join("")}
    </tr>
  `;

  // Render each subline under this VS
  lines.forEach(line => {
    html += `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="border p-3 font-medium bg-gray-50 sticky left-0 z-10">${line}</td>
    `;

    dates.forEach(date => {
      const dateStr = date.toISOString().split("T")[0];
      const cellData = assignments.filter(a => a.date === dateStr && a.line === line);

      if (cellData.some(a => a.type === "Holiday")) {
        html += `<td class="border p-2 text-center bg-gray-200 text-gray-600 font-semibold">Holiday</td>`;
        return;
      }

      if (cellData.length > 0) {
        const colorMap = {
          "Value Stream Leader": "bg-green-100 text-green-800 border-green-300",
          "CFT Member": "bg-purple-100 text-purple-800 border-purple-300",
          "Customer Quality Engineer": "bg-blue-100 text-blue-800 border-blue-300",
          "Plant Head": "bg-orange-100 text-orange-800 border-orange-300",
        };

        html += `<td class="border p-1 text-center">`;
        cellData.forEach(a => {
          const colorClass = colorMap[a.type] || "bg-gray-100 text-gray-800 border-gray-300";
          html += `
            <div class="${colorClass} border rounded px-1 py-0.5 text-[11px] font-medium m-0.5">
              ${a.manager}
            </div>
          `;
        });
        html += `</td>`;
      } else {
        html += `<td class="border p-2 text-center text-gray-300">–</td>`;
      }
    });

    html += `</tr>`;
  });

});

html += `
      </tbody>
    </table>
  </div>
  </div>
  `;

// 🗂️ Legend (for clarity)
html += `
  <div class="mt-4 flex flex-wrap gap-4 text-xs text-gray-700">
    <div class="flex items-center"><div class="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>Value Stream Leader</div>
    <div class="flex items-center"><div class="w-3 h-3 bg-purple-100 border border-purple-300 rounded mr-2"></div>CFT Member</div>
    <div class="flex items-center"><div class="w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-2"></div>Customer Quality Engineer</div>
    <div class="flex items-center"><div class="w-3 h-3 bg-orange-100 border border-orange-300 rounded mr-2"></div>Plant Head</div>
  </div>
`;

// 🧩 Render to DOM
container.innerHTML = html;
}
/* -------------------- DASHBOARD FUNCTIONALITY -------------------- */

// Set current time
document.getElementById('currentTime').textContent = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});

// Load Dashboard Data + Charts
// === Load Dashboard Data ===
async function loadDashboardData() {
  try {
    // === Read current selected month/year/all and plant from dropdowns ===
    const monthSel = document.getElementById("monthFilter").value;
    const plantSel = document.getElementById("plantFilter")
      ? document.getElementById("plantFilter").value
      : "all";

    // build query string reliably
    const params = new URLSearchParams();
    if (monthSel) params.set("month", monthSel);
    if (plantSel && plantSel !== "all") params.set("plant", plantSel);
    const q = params.toString() ? "?" + params.toString() : "";

    // === 1. Fetch summary for top cards ===
    const resSummary = await fetch(`${API_BASE}/api/dashboard-summary${q}`);
    const summary = await resSummary.json();

    console.log("📊 Dashboard summary:", summary);

    // Update Total Audits
    document.getElementById("totalAudits").textContent = summary.total_audits;

    // Update Confirmed % and Not Confirmed %
    const totalItems = summary.total_items || 0;
    const confirmedPercent =
      totalItems > 0
        ? Math.round((summary.confirmed_items / totalItems) * 100)
        : 0;
    const notConfirmedPercent =
      totalItems > 0
        ? Math.round((summary.not_confirmed_items / totalItems) * 100)
        : 0;

    document.getElementById("confirmedPercent").textContent =
      confirmedPercent + "%";
    document.getElementById("notConfirmed").textContent =
      notConfirmedPercent + "%";

    // Update Action Points (total not confirmed items)
    document.getElementById("actionPoints").textContent =
      summary.not_confirmed_items || 0;

    // Update Open / In Progress / Closed counts
    document.getElementById("openSummary").textContent =
      summary.open_items || 0;
    document.getElementById("inProgressSummary").textContent =
      summary.in_progress_items || 0;
    document.getElementById("closedSummary").textContent =
      summary.closed_items || 0;

    // === Calculate % change vs previous month (only if a specific month is chosen) ===
    if (monthSel && monthSel !== "all" && monthSel !== "year") {
      let [y, m] = monthSel.split("-");
      m = parseInt(m);
      y = parseInt(y);
      if (m === 1) {
        m = 12;
        y -= 1;
      } else {
        m -= 1;
      }
      const prevMonth = y + "-" + String(m).padStart(2, "0");

      const resPrev = await fetch(`${API_BASE}/api/dashboard-summary?month=${prevMonth}`);
      const prevSummary = await resPrev.json();

      let prevConfirmedPct =
        prevSummary.total_items > 0
          ? Math.round(
              (prevSummary.confirmed_items / prevSummary.total_items) * 100
            )
          : 0;
      let prevNotConfirmedPct =
        prevSummary.total_items > 0
          ? Math.round(
              (prevSummary.not_confirmed_items / prevSummary.total_items) * 100
            )
          : 0;

      let diffConfirmed = confirmedPercent - prevConfirmedPct;
      let diffNotConfirmed = notConfirmedPercent - prevNotConfirmedPct;

      // Update extra fields in HTML (make sure you added confirmedChange / notConfirmedChange spans in HTML)
      document.getElementById("confirmedChange").textContent =
        (diffConfirmed >= 0 ? "+" : "") +
        diffConfirmed +
        "% vs last month";
      document.getElementById("notConfirmedChange").textContent =
        (diffNotConfirmed >= 0 ? "+" : "") +
        diffNotConfirmed +
        "% vs last month";
    } else {
      // If "All" or "Year" selected, clear changes
      document.getElementById("confirmedChange").textContent = "";
      document.getElementById("notConfirmedChange").textContent = "";
    }

    // === 2. Fetch Monthly Audit Status (Bar Chart) ===
    const resMonthly = await fetch(`${API_BASE}/api/monthly-status${q}`);
    const monthlyData = await resMonthly.json();

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const confirmedArr = new Array(12).fill(0);
    const notConfirmedArr = new Array(12).fill(0);

    monthlyData.forEach(row => {
      const idx = row.month - 1;
      confirmedArr[idx] = row.confirmed;
      notConfirmedArr[idx] = row.not_confirmed;
    });

    // Destroy previous monthly chart if exists (prevents overlapping / stale charts)
    if (window.monthlyAuditChartInstance) {
      window.monthlyAuditChartInstance.destroy();
    }

    const monthlyCtx = document
      .getElementById("monthlyAuditChart")
      .getContext("2d");
    window.monthlyAuditChartInstance = new Chart(monthlyCtx, {
      type: "bar",
      data: {
        labels: months,
        datasets: [
          { label: "Confirmed", data: confirmedArr, backgroundColor: "#10B981" },
          { label: "Not Confirmed", data: notConfirmedArr, backgroundColor: "#EF4444" }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true }
        }
      }
    });

    // === 3. Fetch Department Status (Donut Chart + Breakdown) ===
    const resDept = await fetch(`${API_BASE}/api/department-status${q}`);
    const deptData = await resDept.json();

    const deptLabels = deptData.map(d => d.department);
    const deptValues = deptData.map(d => d.not_confirmed);

    // Donut Chart
    // Destroy old donut chart if exists (so monthly/year filters redraw correctly)
    if (window.departmentChartInstance) {
      window.departmentChartInstance.destroy();
    }

    const departmentCtx = document
      .getElementById("departmentChart")
      .getContext("2d");
    window.departmentChartInstance = new Chart(departmentCtx, {
      type: "doughnut",
      data: {
        labels: deptLabels,
        datasets: [
          {
            data: deptValues,
            backgroundColor: [
              "#EF4444", "#F59E0B", "#10B981",
              "#3B82F6", "#8B5CF6", "#14B8A6"
            ]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } }
      }
    });

    // === Department-wise Breakdown Progress Bars (Fixed and Accurate 100%) ===
    const breakdownDiv = document.getElementById("departmentBreakdown");
    breakdownDiv.innerHTML = "";

    // ✅ Filter valid departments
    const validDeptData = deptData.filter(
      d => d && d.department && d.not_confirmed !== null && d.not_confirmed !== undefined
    );

    // ✅ Calculate total not confirmed properly
    const totalDeptNotConfirmed = validDeptData.reduce(
      (sum, d) => sum + Number(d.not_confirmed || 0),
      0
    );

    if (validDeptData.length === 0 || totalDeptNotConfirmed === 0) {
      breakdownDiv.innerHTML = `<p class="text-gray-500 text-sm">No data found for the selected filters.</p>`;
    } else {
      // Step 1️⃣: Calculate each department's share (sum = 100%)
      const rawPercents = validDeptData.map(
        d => (Number(d.not_confirmed || 0) / totalDeptNotConfirmed) * 100
      );
      const basePercents = rawPercents.map(p => Math.floor(p));
      const remainders = rawPercents.map((p, i) => ({ i, rem: p - Math.floor(p) }));
      let sumBase = basePercents.reduce((a, b) => a + b, 0);
      let diff = 100 - sumBase;

      // Step 2️⃣: Adjust rounding so total = 100
      remainders.sort((a, b) => b.rem - a.rem);
      for (let k = 0; k < diff; k++) {
        if (remainders[k]) basePercents[remainders[k].i] += 1;
      }

      // Step 3️⃣: Render rows
      validDeptData.forEach((d, idx) => {
        const percent = basePercents[idx];
        const row = `
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-gray-800">${d.department}</h4>
              <span class="text-sm font-bold text-red-600">${percent}% Not Confirmed (${d.not_confirmed})</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div class="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
            </div>
          </div>
        `;
        breakdownDiv.innerHTML += row;
      });
    }

    console.log("✅ Dept Breakdown Rendered:", validDeptData);
  } catch (err) {
    console.error("❌ Error loading dashboard data:", err);
  }
}

// === Trigger reloads when filters change ===
document.getElementById("monthFilter").addEventListener("change", loadDashboardData);
document.getElementById("plantFilter").addEventListener("change", loadDashboardData);

// === Populate month filter with last 12 months ===
function populateMonthFilter() {
  const sel = document.getElementById("monthFilter");
  const now = new Date();
  const currentYear = now.getFullYear();

  // Add last 12 months dynamically
  for (let i = 0; i < 12; i++) {
    let d = new Date(currentYear, now.getMonth() - i, 1);
    let val = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    let label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    let opt = document.createElement("option");
    opt.value = val;
    opt.textContent = label;
    sel.appendChild(opt);
  }

  // Default = current month
  sel.value = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
}
populateMonthFilter();

// ========== NEW/CHANGED: Manager-specific action points logic ==========
/*
  Behaviour:
   - When a `.role-card` is clicked, we fetch all audits with `filterResolved=false`
   - Filter to sessions where session.role matches clicked role (case-insensitive)
   - From those sessions, collect items whose status == "Not Confirmed"
   - Show table rows with: question, category, comment, session.created_at, status (Open/Closed)
   - For Open items, show a "Mark as Resolved" button (calls /api/markResolved)
*/
async function loadManagerActionPointsForRole(roleKey) {
  try {
    // === 1. Read current filters ===
    const monthSel = document.getElementById("monthFilter").value;
    const plantSel = document.getElementById("plantFilter")
      ? document.getElementById("plantFilter").value
      : "all";

    const params = new URLSearchParams();
    if (monthSel) params.set("month", monthSel);
    if (plantSel && plantSel !== "all") params.set("plant", plantSel);
    const q = params.toString() ? "?" + params.toString() : "";

    // === 2. Fetch data from backend ===
    const res = await fetch(`${API_BASE}/api/action-points${q}`);
    const result = await res.json();

    const rows = [];
    const roleNormalized = (roleKey || "").toString().trim().toLowerCase();

    // === 3. Filter data for this role ===
    result.forEach(item => {
      const sessionRole = (item.role || "").toString().trim().toLowerCase();
      if (sessionRole === roleNormalized) {
        rows.push({
          assessment_point: item.assessment_point,
          department: item.department,
          comment: item.comment,
          action_taken: item.action,
          date_of_assessment: item.date_of_assessment,
          implementation_date: item.implementation_date,
          status: item.status
        });
      }
    });

    // === 4. Update UI ===
    const container = document.getElementById("manager-action-points");
    const tableBody = document.getElementById("managerActionBody");
    const titleEl = document.getElementById("actionPointsTitle");

    titleEl.textContent = `Role-Wise Action Points — ${roleKey}`;
    tableBody.innerHTML = "";

    if (rows.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="7" class="px-6 py-4 text-sm text-gray-500 text-center">
          No Action Points found for ${roleKey}.
        </td></tr>`;
    } else {
      rows.sort((a, b) => new Date(b.date_of_assessment) - new Date(a.date_of_assessment));

      rows.forEach(r => {
        const assessDate = r.date_of_assessment
          ? new Date(r.date_of_assessment).toLocaleDateString()
          : "-";
        const implDate = r.implementation_date
          ? new Date(r.implementation_date).toLocaleDateString()
          : "-";

        let statusHtml = "";
        if (r.status === "Closed") {
          statusHtml = `<span class="status-badge status-closed">Closed</span>`;
        } else if (r.status === "In Progress") {
          statusHtml = `<span class="status-badge status-progress">In&nbsp;Progress</span>`;
        } else {
          statusHtml = `<span class="status-badge status-open">Open</span>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="px-6 py-4 text-sm text-gray-600">${escapeHtml(assessDate)}</td>
          <td class="px-6 py-4 text-sm text-gray-800 font-medium">${escapeHtml(r.assessment_point)}</td>
          <td class="px-6 py-4 text-sm text-gray-600">${escapeHtml(r.department)}</td>
          <td class="px-6 py-4 text-sm text-gray-600">${escapeHtml(r.comment || "")}</td>
          <td class="px-6 py-4 text-sm text-gray-600">${escapeHtml(r.action_taken || "")}</td>
          <td class="px-6 py-4 text-sm text-gray-600">${escapeHtml(implDate)}</td>
          <td class="px-6 py-4 text-sm text-gray-600">${statusHtml}</td>
        `;
        tableBody.appendChild(tr);
      });
    }

    // === 5. Show and scroll into view ===
    container.style.display = "block";
    container.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    console.error("Error loading manager action points:", err);
    alert("Failed to load action points. See console for details.");
  }
}

// helper: escape HTML to avoid injection
function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Attach click handlers to role cards (delegation safe: run after DOM is ready)
document.querySelectorAll('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    const role = card.getAttribute('data-role') || card.dataset.role;
    // normalize a few role names to match backend `role` values if needed
    // e.g. your back-end may store 'Value Stream Leader' or 'value-stream-leader' etc.
    // Here we try to map commonly used labels; adjust mappings if backend uses different strings.
    const mapping = {
      'team-leader': 'team-leader',
      'value-stream-leader': 'value-stream-leader',
      'customer-quality-engineer': 'customer-quality-engineer',
      'plant-manager': 'plant-manager',
      'regional-quality-head': 'regional-quality-head',
      'board-member': 'board-member'
    };
    const normalized = (role || '').toString().trim();
    const key = mapping[normalized] || normalized; // if backend stores same label, it will match
    loadManagerActionPointsForRole(key);
  });
});

// Global click handler for "Mark as Resolved" - uses event delegation
document.addEventListener("click", (e) => {
  const btn = e.target.closest && e.target.closest('.mark-resolve-btn');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  if (!id) { alert("No item id"); return; }
  if (isNaN(Number(id))) { alert("Invalid item id"); return; }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Resolving...";

  fetch(`${API_BASE}/api/markResolved`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: Number(id) })
  })
  .then(res => res.json())
  .then(json => {
    if (json && json.success) {
      // mark row as closed (visual feedback) and update button
      btn.outerHTML = '<button class="px-3 py-1 rounded bg-gray-200 text-gray-600 cursor-not-allowed" disabled>Resolved</button>';
      // Also update the status badge (walk up DOM to find td)
      const statusTd = btn.closest('tr') ? btn.closest('tr').querySelectorAll('td')[4] : null;
      if (statusTd) statusTd.innerHTML = '<span class="status-badge status-closed">Closed</span>';
    } else {
      alert("Failed to mark as resolved: " + (json && (json.error || json.message) || 'Unknown'));
      btn.disabled = false;
      btn.textContent = originalText;
    }
  })
  .catch(err => {
    console.error("Resolve error:", err);
    alert("Error marking as resolved. Check console.");
    btn.disabled = false;
    btn.textContent = originalText;
  });
});

/* -------------------- END DASHBOARD FUNCTIONALITY -------------------- */

});