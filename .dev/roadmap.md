Standalone, local web server, to help with Nail Salon Scheduling

Use `docker-compose up --build` to build and run the full stack locally, or run `./ship/install.bat` to load pre-saved images and start containers on offline machines.

High Level Architecture:

Overview:
 - Standalone local web server (single-machine) that serves a lightweight SPA and exposes a small REST API for data access and background timers. Data is persisted to local files (one file per day) plus a small index DB for quick lookups.

Components:
 - Frontend: Dark-first single-page application (React) served statically by the local server. Responsible for UI, timers, technician/service selection, and local validation.
 - Backend: Minimal local HTTP server built with Python using Django and Django REST Framework (DRF). Django will serve static assets in development, expose REST endpoints for CRUD on days/appointments via DRF viewsets, and host timers/background tasks inside the Django process or management commands.
 - Storage: Primary persistence is per-day JSON files stored under `data/days/YYYY-MM-DD.json` for easy manual inspection and secure delete. Use a lightweight SQLite file (`data/index.db`) to store metadata and rapid search indices (tech list, services, open/closed days).
 - Business Logic: Server-side modules implement scheduling rules, tech-suggestion heuristics, seating/appointment state machine, and day-close checks. Keep logic testable and small; frontend should call the server for authoritative operations.
 - Recommendation Engine: Simple rules engine (priority queue + configurable weights) running in the backend to suggest next tech based on skills, load, recent assignments, and seating type.
 - Timers & Background Tasks: Hosted in the backend process; use in-memory timers persisted to disk on graceful shutdown. Provide endpoints to query timer state for UI updates.
 - Authentication & Security: Local, PIN-based access. No remote access by default; treat data as local-only and implement secure delete for closed days.
 - CLI/Helpers: Shipping-first containerized installation only. Provide `Dockerfile`s and a `docker-compose.yml` to run the backend (Django + DRF) and a small static server for the frontend. Compose will mount `data/` and `backups/` as volumes so day files and `index.db` remain host-accessible. Provide `docker-compose up --build` as the primary portable install command.
- Shipping: include a `./ship/` folder containing pre-saved Docker image tarball(s) (from `docker save`) and helper scripts:
    - `./ship/install.bat`: checks for Docker, loads image(s) via `docker load -i <image>.tar` and optionally runs `docker-compose up -d`.
    - `./ship/start.bat`: verifies backend and frontend containers are running (via `docker ps` / `docker-compose ps`), starts containers if needed, then opens the frontend homepage.

Key Design Principles:
 - Single-machine, offline-first: app must work without network connectivity; avoid cloud dependencies.
 - Human-readable storage: day files should be JSON for easy inspection and recovery.
 - Small, testable modules: isolate scheduling rules, persistence, and recommendation logic.
 - Minimal dependencies: prefer batteries-included runtime (Python) to keep installation simple.

Technology Stack (one recommended path):
 - Backend: Python 3.10+ with Django and Django REST Framework (DRF). Use Django's ORM, management commands, and admin for developer productivity. In normal usage the app runs inside containers orchestrated by `docker-compose`; the production web process should use `gunicorn` (served from the backend container).
 - Frontend: Small SPA using plain a lightweight React compiled to static assets.
 - Storage: JSON files for per-day data + SQLite for indices and settings.
 - Tooling: `Docker` + `docker-compose` for an isolated, repeatable runtime. Provide `docker-compose.yml` and `Dockerfile`s for backend and frontend to simplify cross-machine installs. Provide `./ship/` with `docker save` exports for offline installation and a Windows `install.bat`/`start.bat` in that folder.

Color theme: Primary, Secondary, Accent
 - Dark theme first (later we will add more)
 - Do not hardcode any color
 - Generate and use only three colors with names: Primary, Secondary, Accent
 - To lighten just lower the opacity
 - List the three colors here:
    - Primary: #1a1a2e (Deep navy - base UI elements, backgrounds)
    - Secondary: #16213e (Dark blue - secondary UI elements, hover states)
    - Accent: #d4af37 (Gold - call-to-action buttons, highlights)

Use `docker-compose up --build` to run the application locally, or `./ship/install.bat` on offline/air-gapped machines to load and start the provided images.


Nav Bar
    Options
        Tech Tab
            - Tech List (all techs - Alias, Name)
            Add new Tech
            Invidual Tech: Skill List - all Services with checklist
        Service tab
            - Services List (Name, Time needed, isBonus)
            Add new Service
            Individual Service: Tech Skill list - all techs with checklist
        Settings
            -New Day Checklist
                - add/edit
            -End Day Checklist
                - add/edit
    Tech Time
        Drop down:
            Clock In/Out
            Tech Break Start/Stop
    Closed Day Secure Delete


Main Body: Day Page
    New Day (Button)
        Day: New Day (default to current day - but let the user choose)
        New Day checklist - insert the widget to sidebar
        New Day: Every day a separate save file
        New Day: Allow with clear warning, do not override 
    Open Day (Button)
    Body: Day Table with Day Rows (model under)
        Collumn Names:
        Row Number
        Tech Alias
        Tech Name
        New Seating Button (open the Seating form, add to Seating List)
        Seating Collums (Unlimited, 1-11 per page, next page 12-22 and so on, pages only added when the seating excess current page)
        (Provide picture for reference when implementing)
    Day End (Button)
        Insert Day End Widget to the 
    Close Day
        Disable the edits
        Provide the summary (will provide details and how to later)


Side Bar
    New Day Checklist (dissapears after everything is checked)
    End Day Checklist (dissapears after everything is checked)
    Widgets: Next Service tech Suggestion


Tech model
Alias (Primary)
Name (Optional)
Tech: Skill List - all Services with checkboxes


Service model
Name (string)
Time needed (integer in minutes)
IsBonus: Yes or no - boolean
Service: all techs with checkboxes


Day: New Day (default to current day)
    Day: Open Day
    Day: Tech Clock In/Out
    Day: Tech Break Start/Stop
    Next Service  tech Suggestion


Day Rows List populating logic
    The Day Row is based on Tech Clock-in
    Example: User clocks in Hannah > Adds Hannah in first row. User then clocks in Tam > Adds Tam in 2nd Row, and so on - it it's going to be important for scheduling suggestions


DayRow Model
    Row Number
    Tech Alias
    Tech Name
    Seating List - add seatings here
    Hidden stats (Regular_turns, Bonus_turns - on seating new/edit/delete update these numbers, bonus_turns is the sum of all isBonus seatings in a day, regular is the sum of non isBonus ones)


New Seating Button - Form
    Requested Checkbox
    Service: with dropdown
    add turns to right variable: if it's requested self-determine if it's bonus turn, for first requested in day it's regular turn, then every other it's bonus turn.. if not requested self-determine based on service.
    Provide a checkbox at the end for verification - update with change to requested checkbox and service - and allow manual override


Click actions for Day table
    Double click Seating to close/edit/delete - add value for closing, add a checkbox for valuepenalty.
    Every minute update how many minutes expired on all open seatings (value 0)
    Double click on Tech Alias to open Tech Profile



Seating model
    isRequested: yes or no
    isBonus: yes or no
    Service: Service (from services)
    rowid: number  - do we need it? We are calling it from the row and its added to SeatingList
    Time: timestamp
    value: integer (0 means the seating is open and tech is working)


Scheduling Suggestion Logic - Services for walk-in priority:
    1: Tech availability - already has open seating and not much time passed
    2: Tech skill - must know how to do it
    3: Turns type (Regular or Bonus - dependent on Service) give priority to techs with less turns
    4: Rows number (lower number should get clients first)


Implementation plan:

Phase 0: Project Setup & Infrastructure **IMPLEMENTED**
    - Create project folder structure: backend/, frontend/, data/, scripts/
    - Initialize backend: Django project and apps, Django REST Framework, SQLite, requirements.txt (development tooling will be provided inside containers)
    - Initialize frontend: React (Vite or Create React App), basic dependencies
    - Create `Dockerfile`s for the backend and frontend and a `docker-compose.yml` to run the full stack with one command (`docker-compose up --build`). Configure compose to mount `data/` and `backups/` as volumes so day files remain host-accessible.
    - Add ship/ folder containing `docker save` export(s) of the built imwages plus `install.bat` and `start.bat` to support offline/air-gapped installs.
    - Set up .gitignore (exclude data/, venv/, node_modules/, build artifacts)
    - Initialize data/ structure: data/days/, data/backups/, data/index.db, data/config.json
    - Define initial SQLite schema for index.db: technicians, services, tech_skills, day_metadata
    - Deliverable: Working `docker-compose.yml` + `Dockerfile`s that run the app via `docker-compose up --build`, plus a `./ship/` package containing saved Docker image(s) and `install.bat`/`start.bat` for portable shipping. The stack should serve a "Hello World" page on localhost:8010.

Phase 1: Core Data Models & API Foundation **IMPLEMENTED**
    - Backend: Define Django models and DRF serializers for Technician, Service, Seating, DayRow, DayData
        * Technician model:
            - alias: string (primary key, required)
            - name: string (optional)
            - skills: list of service names/IDs (services this tech can perform)
        * Service model:
            - name: string (primary key, required)
            - time_needed: integer (minutes required for service)
            - is_bonus: boolean (whether this service counts as bonus turn)
            - qualified_techs: list of tech aliases (techs who can perform this service)
        * Seating model:
            - id: string/UUID (unique identifier for each seating)
            - is_requested: boolean (true if customer requested specific tech)
            - is_bonus: boolean (whether this counts as bonus turn for the tech)
            - service: string (service name/ID)
            - time: timestamp (when seating was created)
            - value: integer (0 = open/in-progress, >0 = closed with payment value)
            - has_value_penalty: boolean (optional, for tracking payment issues)
        * DayRow model:
            - row_number: integer (position in daily schedule, based on clock-in order)
            - tech_alias: string (reference to technician)
            - tech_name: string (cached for display)
            - seatings: list of Seating objects
            - regular_turns: integer (count of non-bonus seatings)
            - bonus_turns: integer (count of bonus seatings)
            - is_on_break: boolean (true if tech currently on break; toggled by user)
        * DayData model:
            - date: date (YYYY-MM-DD)
            - status: enum (open, ended, closed)
            - day_rows: list of DayRow objects
            - new_day_checklist: list of checklist items with completion status
            - end_day_checklist: list of checklist items with completion status
            - created_at: timestamp
            - closed_at: timestamp (optional)
    - Backend: Use Django apps and ORM for database operations (tech CRUD, service CRUD); provide model managers where appropriate
    - Backend: Create file-based day persistence (load/save JSON from data/days/)
    - Backend: Implement REST endpoints for technicians (/api/techs) and services (/api/services)
    - Backend: Add validation and error handling
    - Frontend: Set up API client/service layer with fetch wrappers
    - Frontend: Create basic routing structure (React Router or similar)
    - Test: Verify GET/POST/PUT/DELETE for techs and services via Postman or curl
    - Deliverable: Full CRUD for technicians and services

Phase 2: Color Theme System **IMPLEMENTED**
    - Define three CSS custom properties: --color-primary, --color-secondary, --color-accent
    - Choose initial dark theme colors and document in roadmap.md:
        * Primary: Base UI elements, backgrounds
        * Secondary: Secondary UI elements, hover states
        * Accent: Call-to-action buttons, highlights
    - Implement opacity-based lightening/darkening utilities (CSS or JS helpers)
    - Create global CSS file with theme variables
    - Apply theme to basic layout components
    - Deliverable: Themed dark UI with no hardcoded colors

Phase 3: Navigation Bar & Options **IMPLEMENTED**
    - Frontend: Create Nav Bar component with "Options" and "Tech Time" sections
    - Frontend: Implement Options modal/sidebar with "Tech Tab" and "Service Tab"
    - Frontend: Tech Tab - list all techs, add new tech button, tech detail view
    - Frontend: Tech detail - display tech name, show all services with skill checkboxes
    - Frontend: Service Tab - list all services, add new service button, service detail view
    - Frontend: Service detail - display service name, show all techs with skill checkboxes
    - Backend: Add /api/techs/{id}/skills endpoint to get/update tech skills
    - Backend: Add /api/services/{id}/techs endpoint to get/update service-tech associations
    - Frontend: Tech Time with input(searcheable by alias/name) with Clock In/Out and Break Start/Stop (UI only, no logic yet)
    - Frontend: Add "Delete" modal in nav (ui only, no logic yet)
    - Deliverable: Full Options UI with tech/service management

Phase 4: Day Management - Basic Lifecycle **IMPLEMENTED**
    - Backend: Implement /api/days endpoint (GET list, GET by date, POST new day)
    - Backend: New Day logic - create YYYY-MM-DD.json file, initialize empty day structure with metadata
    - Backend: Open Day logic - load existing day file and return data
    - Backend: Implement warning check if day file already exists
    - Frontend: Create Day Page component with New Day and Open Day buttons
    - Frontend: New Day button - shows dialog with date picker (default today), creates new day
    - Frontend: Open Day button - shows dialog to select existing day, loads day data
    - Frontend: Implement warning if trying to create day that already exists
    - Frontend: Display selected/active day header in main body (shows date, day status)
    - Note: Day table/seating content implemented in Phase 7; checklists in Phase 8
    - Deliverable: Day creation and opening with basic UI (no table content yet)

Phase 4.5: Settings Configuration **IMPLEMENTED**
    - Backend: Create /api/settings endpoint (GET/PUT for checklist configuration)
    - Backend: Store checklist templates in config.json (new_day_checklist, end_day_checklist arrays)
    - Frontend: Add Settings tab to Options menu
    - Frontend: Create New Day Checklist editor (add/edit/delete checklist items)
    - Frontend: Create End Day Checklist editor (add/edit/delete checklist items)
    - Frontend: Allow reordering of checklist items
    - Backend: Validate checklist data before saving
    - Deliverable: Full checklist configuration in Settings

Phase 5: Tech Clock-in & Break Toggle **IMPLEMENTED**
    - Backend: Clock-in is represented by presence of a `DayRow`.
    - Backend: Add endpoint(s):
        - `POST /api/days/{date}/rows/clock-in` to add a technician to `day_rows` (if not present)
        - `POST /api/days/{date}/rows/clock-out` to mark a technician as clocked-out
        - `POST /api/days/{date}/rows/{row_number}/toggle-break` to toggle `is_on_break` on the `DayRow`
    - Backend: Persist `is_on_break` and row presence in the day JSON file (DayData.day_rows)
    - Frontend: Wire Tech Time dropdown actions to call clock-in/clock-out and break-toggle endpoints
    - Frontend: Display tech status indicators derived from `DayRow` presence and `is_on_break` flag
    - Deliverable: Lightweight clock-in/clock-out and break toggle functionality (no separate event log)

Phase 6: Secure Delete **IMPLEMENTED**
    - Backend: Implement /api/days/{date}/secure-delete endpoint
    - Backend: Use secure deletion (overwrite with random data, then delete file)
    - Backend: Update index.db to mark day as deleted
    - Frontend: Implement Closed Day Secure Delete UI with confirmation dialog
    - Frontend: Add strong warning messages (multi-step confirmation)
    - Frontend: Only allow deletion of closed days
    - Deliverable: Secure deletion of closed day files

Phase 7: Day Table & Seating Management **IMPLEMENTED**
    - Backend: Expand day data model to include day_rows array and seating tracking
    - Backend: Create /api/days/{date}/rows endpoint for day row management
    - Backend: Create /api/days/{date}/seatings endpoint (POST create, PUT edit, DELETE)
    - Backend: Implement seating model (isRequested, isBonus, service, time, value)
    - Backend: Implement turn counting logic (regular_turns, bonus_turns per tech)
    - Backend: Implement bonus turn logic: first requested = regular, second = bonus, then alternate; non-requested based on service.isBonus
    - Backend: Auto-populate day rows when tech clocks in (link to Phase 5 clock-in endpoints)
    - Frontend: Create Day Table component with columns: Row#, Tech Alias, Tech Name, New Seating button, Seating columns
    - Frontend: Implement pagination for seatings (1-11 per page, expand as needed)
    - Frontend: New Seating button opens form with: Requested checkbox, Service dropdown, Bonus verification checkbox with auto-determination
    - Frontend: Display seatings in table cells with timestamps and service info
    - Frontend: Double-click seating to open edit/close/delete modal
    - Frontend: Seating close modal: add value field, valuepenalty checkbox
    - Frontend: Double-click Tech Alias to open Tech Profile (basic view for now)
    - Frontend: Every minute update elapsed time on all open seatings (value=0)
    - Backend: Validation to ensure tech has skill for selected service
    - Deliverable: Full day table with seating management and turn tracking

Phase 8: Checklists & Day End **IMPLEMENTED**
    - Backend: Add /api/days/{date}/checklist endpoint (GET items with completion status, POST to mark item complete)
    - Backend: Load checklist templates from config.json on day creation
    - Backend: Persist checklist state in day JSON file
    - Backend: Create /api/days/{date}/summary endpoint for day-end summary
    - Backend: Value penalty logic (-3 value if applied in summary)
    - Backend: Calculate summary stats table: Tech alias, tech name, total value without penalty, total value with penalty
    - Backend: Implement day close logic (validate all seatings closed, checklist complete, mark day as closed)
    - Frontend: Create Side Bar component (persistent, visible when day is open)
    - Frontend: Display New Day Checklist in sidebar (disappears when all checked)
    - Frontend: Display End Day Checklist in sidebar after "Day End" button clicked
    - Frontend: Add "Day End" button to main body
    - Frontend: Add "Close Day" button (enabled only when End Day Checklist complete)
    - Frontend: Close Day Summary modal shows stats and confirmation
    - Frontend: After closing, disable all edits to day data
    - Deliverable: Complete checklist system and day close workflow


Phase 9: Tech Recommendation Engine **IMPLEMENTED**
    - Overview: Provide always-visible recommendation widgets and configurable service-specific recommendation widgets. Recommendations support both Regular and Bonus turn suggestions and fast UI actions (double-click to expand / select).
    - Backend: Implement scheduling suggestion algorithm with 4-priority logic (used for detailed recommendations):
        1. Tech availability (no open seating OR open seating with more than 70% time passed)
        2. Tech skill (must have service in skill list)
        3. Turn balance (prefer techs with fewer turns of the appropriate type - regular or bonus)
        4. Row number (lower row number = higher priority)
    - Backend: Create `/api/recommend` endpoint (input: service optional; output: sorted list of suggested techs with reasoning and which priority checks passed)
    - Backend: Consider tech break status and clock-in status in availability calculation
    - Backend/UI behavior: Two always-visible recommendation streams shown by default (these skip the skill check):
        - Recommendation for Regular Turn — SKILL CHECK SKIPPED (shows best techs to receive a regular turn regardless of skill)
        - Recommendation for Bonus Turn — SKILL CHECK SKIPPED (shows best techs to receive a bonus turn regardless of skill)
    - Settings: Add a **Recommendation** tab to Settings
        - List all services with checkboxes
        - Allow selecting services to create additional service-specific recommendation widgets
        - These extra widgets use the full 4-priority algorithm (including skill check) and are tied to the checked services
    - Frontend: Side Bar widgets
        - Always-visible widgets: `Regular Turn` and `Bonus Turn` (small display, skip skill check)
        - Service-specific widgets: one widget per selected service from Settings (full checks including skill)
        - Small display: show recommendation name and only the top 2 techs inline:
            - 1st tech
            - 2nd tech
        - Interaction: double-click recommendation name to expand the widget (show top 6 techs)
        - Interaction: double-click any tech name (in small or expanded view) to add a New Seating pre-filled with that tech; if the expanded widget is a service-specific widget, also pre-fill the service in the New Seating form
    - Frontend: Visual indicators on widget items on hover: availability, skill (when used), turn counts, row number priority
    - Frontend: Widgets refresh automatically when day data changes; clicking/double-clicking performs the described quick actions
    - Deliverable: Always-visible Regular/Bonus recommendation widgets, configurable service-specific widgets via Settings, small-display top-2 compact UI, expand-to-6 and double-click quick-add seating behavior

---

Phase 9.1: Bug Fixes & Core Improvements & Consistency Fixes **IMPLEMENTED**
    Bugs:
    - Tech alias validation: enforce uniqueness to prevent backend errors
    - Tech Time modal: eliminate double-click behavior and improve responsiveness
        - Auto clock-in when selecting a tech (if not already clocked in)
        - Remove standalone "Clock In" button
        - Execute Break Start/Stop and Clock Out immediately (no modal submission)
        - Auto-dismiss modal after action or when clicking outside
    
    Improvements:
    - Service model: add `short_name` field (short code for display in compact views, e.g., "Mani", "Pedi")
    - Service model: add `is_default` flag for base services available to all techs
        - Auto-assign skill to all existing techs on service creation
        - Auto-assign skill to all new techs when hired
        - Allow manual skill override (not hardcoded)
    - Sidebar layout structure (default order): New Day Checklist → Recommendation Widgets → End Day Checklist
        - New Day Checklist: auto-hide when complete
        - Recommendation Widgets: always visible during day (Phase 9)
        - End Day Checklist: appears after "Day End" button clicked
    - Close Day Summary:
        - Toggle between "Current - Sorted by Alias then Name" and "Sorted by RowID from DayTable" filter modes via alias column header click
        - Display column totals for: Value, After Adjustment, Adjustments
        - Allow reopening summary view after day closure

**IMPLEMENTED** Phase 9.1.1 [COMPLETE] **IMPLEMENTED**
    Fixed Bugs:
    ✅ Services name validation: Added uniqueness validation in ServiceSerializer
    ✅ Improved error messages in frontend for duplicate Tech Alias and Service Name
      - Now extracts DRF validation errors (field: [messages]) and displays them
      - Example: "Service with name 'X' already exists" instead of generic "API request failed"
    ✅ Clock-Out errors fixed:
      - Frontend now checks is_active field when determining if tech is clocked in
      - Clocked-out techs (is_active=false) no longer appear as clocked in
      - Clock Out and Break buttons hidden for inactive techs
      - Tech Time dropdown only shows active (clocked-in) techs as available for actions
    Implementation:
    - Backend: Added validate_name() method to ServiceSerializer (backend/services/serializers.py)
    - Frontend: Updated getTechRow() to check row.is_active (frontend/src/components/TechTimeDropdown.jsx)
    - Frontend: Improved error extraction in TechProfile and ServiceProfile to parse DRF validation errors
    Bug:
    Clock-out doesn't disable the tech's dayrow

**IMPLEMENTED** Phase 9.2: Seating Display Logic Rework **IMPLEMENTED**

Backend: Persist Seating Sequence (requirements)
- Keep `DayRow.seatings` as the authoritative, ordered list persisted to the day JSON file.
- Do not add explicit per-seating slot indices or allow server-side reordering endpoints — the server should only persist the sequence as-is.
- When a new seating is created via existing `/api/days/{date}/seatings` endpoint, append it to the corresponding `DayRow.seatings` list and update `regular_turns`/`bonus_turns` counters based on the seating's `is_bonus` flag.
- On seating delete/close, remove the seating from the `DayRow.seatings` list and decrement the appropriate turn counter.
- Accept full `DayData` updates (or a dedicated row-level replace) for clients that send the updated `seatings` array; validate incoming seating objects server-side before persisting.

Frontend: Placement & Display (behavior)
- Frontend computes visual placement from the persisted `DayRow.seatings` list each render: regular turns are laid out left-to-right, bonus turns right-to-left.
- Frontend recalculates placement whenever a day-row is modified (add/edit/delete seating) to preserve current layout semantics without server involvement.
- No backend placement logic: backend only stores the sequence; visual placement rules live in the frontend.

Notes & Migration
- Existing day files already use `seatings` arrays; this approach is compatible with current persistence format and requires no schema migration.
- Concurrency: document that clients should POST incremental changes (create/delete) or push full row `seatings` arrays; servers will overwrite the persisted list with the validated payload.

**IMPLEMENTED** Phase 9.2.1 [FIXED]
Placement not behaving as intended: 
 - The seating placement doesn't change, although I deleted the seating (I want it to update after modification)
   - Jojo had this array: [0: Regular Seating, 1: Requested Seating 1, 2: Requested Seating 2]
    - The placement was right for this. Seat 0 and 1 on the left, Seat 2 on the right
    - I deleted Requested Seat 1, so array became [0: Regular Seating, 1: Requested Seating 2]
    - The placement shoud be Seat 0 and Requested Seating 2 on the left, but Requested seating 2 stayed on the right

**IMPLEMENTED** Phase 9.3: Seating Display & Layout Optimization
    Day table refinements:
    - Compact seating display: merge details to single row, minimize padding
    - Add seating: double-click row ID or empty seating cell to add seating for that tech
    - Remove action column
    Seating interactions (streamline closing workflow):
    - Open seatings: single-click to open Seat Closing Modal (new)
        - Autofocus value input field for rapid entry
        - Submit via Enter key
        - Auto-check value adjustment if value is not divisible by 5
            - Value adjustment logic: checkbox applies fixed -3 adjustment; validation in Phase 9.3 (divisible by 5) is a UI helper for data entry, not a business rule
            - allow manual check/uncheck
    - Open seatings: double-click to edit details
        - Editable fields: service short_name, time_needed, isRequested toggle
        - Auto-recalculate turn types on changes
        - Remove the value input and closing button - we will be doing it in the separate modal
    - Closed seatings: double-click to view/adjust details
        - toggleable: value adjustment checkbox, isRequested checkbox
        - Update and close the modal after any checkbox toggle
        - Auto-recalculate turn types on changes
    Recommendation Sidebar:
    - Make it more compact, less padding, the spaces between lines are too big, keep the fontsize same
    - Right now: double-click to expand the recommendation list - change to a single click

**IMPLEMENTED** Phase 9.4: Quick Action Bar
    New secondary navbar widget for rapid tech/seating workflow (positioned below main Navbar):
    - Tech lookup dropdown: searchable dropdown (by alias or name) to quickly add a seating for selected tech
        - Select tech → opens New Seating Modal pre-filled with that tech
        - Clear visual search/filter behavior
    - Open seatings filter: text input to filter the panel next by tech alias/name
    - Open seatings panel: horizontal scrollable list showing all current open seatings (tech alias + seating display)
        - Sorted by time created (oldest first)
        - Click seating to open Seat Closing Modal (consistent with Phase 9.3 behavior)
        - Shows: tech alias, service short_name, elapsed time
        - Empty state message when no open seatings exist


**IMPLEMENTED** Phase 9.5 [COMPLETE]: Minor UI improvements and bug fixes
    - Moved the Day header and action buttons into the Main Navbar:
        - Current Day display with open/ended/closed status badge
        - Buttons: End Day, Close Day, View Summary (actions now in `NavBar`)
    - Fixed summary sorting/filter by row id: backend summary now includes `row_number` so the Close Day Summary can sort by row number correctly.
    - Changes tested by building and running the Docker stack; backend summary endpoint verified for `2026-01-07`.


---

Phase 9.6: Row Management & Summary Enhancements
    Overview: Improve day row interaction patterns, add row deletion and reordering capabilities, enhance Close Day Summary with better defaults and absent tech tracking, and fix Tech Time clock-out behavior.
    
    Close Day Summary Improvements:
    - Backend: Include all clocked-in techs (including absent techs with no seatings) in the summary endpoint response
    - Backend: Ensure summary data includes tech row information for proper sorting
    - Frontend: Change default summary sort to row ID (ascending)
    - Frontend: Display absent techs (clocked in but no seatings) with zero values for easier data entry and record keeping
    
    Tech Time Clock-Out Fixes:
    - Backend: Verify clock-out endpoint properly marks tech as inactive (is_active=false) in DayRow
    - Backend: Ensure clock-in logic does not create duplicate rows for techs who already have a row
    - Frontend: Disable day row UI (similar to Break behavior) when tech is clocked out
    - Frontend: Prevent clock-in from creating duplicate rows if tech already exists in day table
    
    Day Row Interaction Changes:
    - Frontend: Tech Alias column - change from double-click to press-and-hold to open Tech Time Menu
    - Frontend: Tech Alias column - make double-click add seating (consistent with row ID and empty seating columns)
    
    New Feature: Row Deletion
    - Backend: Create DELETE endpoint /api/days/{date}/rows/{row_number} to remove a day row
    - Backend: On row deletion, clock out the tech and resequence remaining row numbers (no gaps)
    - Backend: Validate that row has no open seatings before allowing deletion
    - Frontend: Press-and-hold row ID to open row context menu with Delete option
    - Frontend: Show confirmation modal before deletion: "Delete row for [Tech Name]? This will clock out the tech and remove the row. This action cannot be undone."
    - Frontend: After deletion, refresh day table to reflect resequenced row numbers
    
    New Feature: Row Reordering
    - Backend: Create PUT endpoint /api/days/{date}/rows/reorder to update row positions
    - Backend: Accept target row number and tech alias, resequence all rows accordingly
    - Backend: Maintain day table sort by row ID at all times
    - Frontend: Press-and-hold row ID to open row context menu with Move option
    - Frontend: Enable drag-to-position or numeric input to specify new row position
    - Frontend: Update day table immediately with new row order
    - Frontend: Visual feedback during move operation (highlight target position)
    
    Deliverable: Enhanced row management with delete/move capabilities, improved Close Day Summary with absent tech tracking and row ID default sort, fixed clock-out behavior preventing UI inconsistencies

---

**IMPLEMENTED** Phase 10: User System & Quick PIN Switching **IMPLEMENTED**
    Overview: Extend the existing users app to add PIN-based user management with quick switching for multi-user environments. Users are identified by unique PINs without requiring usernames.
    
    User Model & Backend:
    - Backend: Review and extend existing User model in backend/users/models.py
    - Backend: Ensure User model has fields: name (string), pin (string, unique, hashed)
    - Backend: Users persist to SQLite via Django ORM (standard Django users table)
    - Backend: Implement PIN hashing using Django's password hashing (pbkdf2_sha256)
    - Backend: Create /api/users endpoint using DRF viewset for user management (GET list, POST create, PUT update, DELETE)
    - Backend: Create UserSerializer in backend/users/serializers.py
    - Backend: Add validation: PIN must be unique, minimum 4 digits
    - Backend: Create /api/auth/login endpoint (accepts PIN only, returns user info + session token)
    - Backend: Use Django session middleware to track current logged-in user
    - Backend: No username required - PIN is the sole authentication credential
    
    Frontend User Management:
    - Frontend: Add "Users" tab to Options menu
    - Frontend: User list view showing all registered users (name only, PINs hidden)
    - Frontend: Create User form (name input + PIN input with confirmation)
    - Frontend: Edit user (change name or PIN)
    - Frontend: Delete user with confirmation dialog
    - Frontend: PIN input fields should be password-masked
    
    Quick User Switching:
    - Frontend: Add user switcher to navbar (shows current user name)
    - Frontend: Click user name to open quick switch modal
    - Frontend: Quick switch modal: PIN pad or numeric input for fast switching
    - Frontend: On successful PIN entry, switch to that user's session
    - Frontend: No logout required - seamless switching between users
    - Frontend: Display current user name prominently in navbar
    
    Session Management:
    - Backend: Store current user in Django session (no token expiration for local use)
    - Backend: Track user actions in day data (e.g., who opened/closed the day)
    - Frontend: Persist session across page refreshes
    - Frontend: Optional "Lock" button to require PIN re-entry
    - Frontend: No automatic logout/timeout (local, trusted environment)
    
    Initial Setup:
    - Frontend: On first launch (no users exist), show user creation screen
    - Frontend: Require at least one user to be created before accessing the app
    - Frontend: After initial user creation, proceed to main app
    
    Deliverable: Multi-user system with PIN-based quick switching, no usernames, seamless user management in Options

Phase 11: Data Export/Import & Backups
    - Backend: Create /api/export endpoint (zip all day files and index.db)
    - Backend: Create /api/import endpoint (upload and restore from zip)
    - Backend: Implement automatic backup on day close
    - Frontend: Add Export/Import buttons in Options
    - Frontend: Add backup management UI (list backups, restore, delete old backups)
    - Deliverable: Data portability and backup system

Phase 12: Advanced Day Features & Polish
    - Frontend: Add visual indicators for tech status (clocked in, on break, clocked out) in day table
    - Frontend: Add color coding for seatings (open, in-progress, closed, requested vs walk-in)
    - Frontend: Implement keyboard shortcuts for common actions (e.g., Ctrl+N for New Seating)
    - Frontend: Add search/filter for finding specific days or techs in historical data
    - Backend: Add /api/days/stats endpoint for cross-day analytics
    - Backend: Implement data validation and business rule enforcement (e.g., can't close seating before minimum service time)
    - Frontend: Add undo functionality for accidental seating deletions (within session)
    - Frontend: Improve form validation with real-time feedback
    - Frontend: Add tooltips and help text for complex features
    - Deliverable: Enhanced UX, data integrity, and usability features

Phase 13: Testing & Quality Assurance
    - Add unit tests for backend logic (pytest)
    - Add integration tests for API endpoints
    - Add frontend component tests (React Testing Library)
    - Perform end-to-end testing scenarios
    - Add error boundaries and graceful error handling
    - Optimize performance (lazy loading, code splitting)
    - Add loading states and user feedback
    - Document API endpoints (OpenAPI/Swagger)
    - Deliverable: Tested, polished application

Phase 14: Deployment Preparation
    - Create production build scripts
    - Optimize frontend bundle size
    - Add logging configuration
    - Create user manual/documentation
    - Prepare upgrade/migration scripts
    - Test docker-compose flow and the `./ship/` install/start flow on a clean Windows machine
    - Deliverable: Production-ready application

Development Notes:
    - Each phase should be completable in 1-3 days of focused work
    - Test thoroughly before moving to next phase
    - Keep commits atomic and well-documented in .dev/changelog.md
    - Update this roadmap as requirements evolve
    - Core features (Phases 0-9) fully defined; Phases 10-14 are polish and infrastructure
    - Day Table (Phase 7) is the most complex phase - may need to split into sub-phases during implementation

