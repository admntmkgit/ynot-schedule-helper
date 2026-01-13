# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Phase 8 Implementation - 2026-01-07

#### Added - Phase 8: Checklists & Day End
- Backend:
  - Added checklist management endpoints to [DayViewSet](../backend/days/views.py):
    - `GET /api/days/{date}/checklist/` - Get checklist items with completion status
    - `POST /api/days/{date}/checklist/` - Toggle checklist item completion
    - Checklist types: new_day and end_day
  - Added day summary endpoint:
    - `GET /api/days/{date}/summary/` - Calculate day-end summary with tech statistics
    - Value penalty logic: -$3 per penalty flag
    - Tech stats include: regular/bonus turns, value with/without penalty, penalty count
    - Validation checks: all seatings closed, end day checklist complete
  - Added day state transition endpoints:
    - `POST /api/days/{date}/end-day/` - Transition from 'open' to 'ended' status
    - `POST /api/days/{date}/close-day/` - Close day (validates seatings and checklist)
    - Day close validation: all seatings must be closed, end day checklist complete
    - Sets closed_at timestamp on day close
- Frontend:
  - Created [Sidebar.jsx](../frontend/src/components/Sidebar.jsx) component:
    - Displays persistent sidebar when day is open
    - New Day Checklist: Shows until all items checked (only in 'open' status)
    - End Day Checklist: Shows when day status is 'ended' or 'closed'
    - Click checklist items to toggle completion
    - Auto-hides completed new day checklist
  - Created [Sidebar.css](../frontend/src/components/Sidebar.css):
    - Compact sidebar design (280px width)
    - Checkbox-style checklist items with visual feedback
    - Responsive layout for mobile devices
  - Created [CloseDaySummaryModal.jsx](../frontend/src/components/CloseDaySummaryModal.jsx):
    - Displays comprehensive day summary before closing
    - Tech statistics table with columns:
      - Technician (alias and name)
      - Turns (regular and bonus counts)
      - Value (without penalty, crossed out)
      - After Penalty (highlighted value)
      - Penalties (count of applied penalties)
    - Validation warnings if prerequisites not met
    - Confirmation section explaining close implications
    - Prevents closing if validation fails
  - Created [CloseDaySummaryModal.css](../frontend/src/components/CloseDaySummaryModal.css):
    - Statistics table styling with alternating rows
    - Color-coded values and penalties
    - Warning banners for validation issues
    - Confirmation section with visual emphasis
  - Updated [HomePage.jsx](../frontend/src/pages/HomePage.jsx):
    - Added "End Day" button (visible when status = 'open')
    - Added "Close Day" button (visible when status = 'ended')
    - Integrated Sidebar component
    - Day closed banner when status = 'closed'
    - Confirmation dialog for day end action
  - Updated [HomePage.css](../frontend/src/pages/HomePage.css):
    - Layout changes for sidebar integration (.day-content-with-sidebar)
    - Flexbox layout with main content and sidebar
    - Responsive design: sidebar moves below content on mobile
    - Day closed banner styling
  - Updated [DayTable.jsx](../frontend/src/components/DayTable.jsx):
    - Pass dayStatus to modal components
    - Disable new seating button when day is closed
  - Updated [SeatingModal.jsx](../frontend/src/components/SeatingModal.jsx):
    - Accept dayStatus prop
    - Prevent edits/deletes when day is closed
    - Show error message if edit attempted on closed day
  - Updated [NewSeatingModal.jsx](../frontend/src/components/NewSeatingModal.jsx):
    - Accept dayStatus prop
    - Prevent seating creation on closed days

#### Technical Details
- Day status flow: 'open' → 'ended' → 'closed'
- Checklists loaded from config.json templates on day creation
- Checklist state persisted in day JSON file
- Value penalty: -$3 applied to total_value_with_penalty for each has_value_penalty flag
- All edits disabled when day status = 'closed'
- Summary calculation runs server-side with validation checks

### Phase 7 Implementation - 2026-01-07

#### Added - Phase 7: Day Table & Seating Management
- Backend:
  - Added seating management endpoints to [DayViewSet](../backend/days/views.py):
    - `POST /api/days/{date}/seatings/` - Create new seating for a tech
    - `PUT /api/days/{date}/seatings/{seating_id}/` - Update seating (close, edit)
    - `DELETE /api/days/{date}/seatings/{seating_id}/` - Delete a seating
  - Implemented bonus turn determination logic:
    - Requested: First requested = regular, subsequent = bonus
    - Walk-in: Based on service's is_bonus flag
  - Added validation for tech skills before creating/updating seatings
  - Turn counting (regular_turns, bonus_turns) automatically updates on seating changes
  - Seating model supports: is_requested, is_bonus, service, time, value, has_value_penalty
- Frontend:
  - Created [DayTable.jsx](../frontend/src/components/DayTable.jsx) component:
    - Displays day rows with technicians and their seatings
    - Alternating row colors (beige/tan) for easy tracking
    - Pagination for seating columns (11 per page, expandable)
    - Real-time elapsed time tracking for open seatings (updates every minute)
    - Double-click tech alias to open tech profile
    - Double-click seating to open edit/close/delete modal
    - Visual indicators for seating status (open/closed, requested/walk-in, bonus/regular)
    - Color-coded legend for seating types
  - Created [DayTable.css](../frontend/src/components/DayTable.css):
    - Dark theme with alternating row colors
    - Status-based coloring for seatings
    - Responsive design
    - Table legend with visual indicators
  - Created [NewSeatingModal.jsx](../frontend/src/components/NewSeatingModal.jsx):
    - Service dropdown filtered by tech skills
    - Requested checkbox
    - Auto-determination of bonus turn with logic display
    - Manual override checkbox for bonus verification
    - Real-time bonus calculation based on existing seatings
  - Created [NewSeatingModal.css](../frontend/src/components/NewSeatingModal.css):
    - Bonus verification section styling
    - Badge styles for bonus/regular indicators
  - Created [SeatingModal.jsx](../frontend/src/components/SeatingModal.jsx):
    - View seating details
    - Close seating with value and penalty options
    - Edit seating properties
    - Delete seating with confirmation
    - Elapsed time display for open seatings
  - Created [SeatingModal.css](../frontend/src/components/SeatingModal.css):
    - Info display styling
    - Close seating form
    - Warning and error message styles
  - Updated [TechProfile.jsx](../frontend/src/components/TechProfile.jsx):
    - Added support for tech object prop (from day table)
    - Can be opened with either alias or tech object
  - Updated [dayService.js](../frontend/src/services/dayService.js):
    - Added createSeating, updateSeating, deleteSeating methods
  - Updated [HomePage.jsx](../frontend/src/pages/HomePage.jsx):
    - Integrated DayTable component
    - Added handleDayUpdate callback for refreshing data

### Phase 5 & 6 Implementation - 2026-01-07

#### Added - Phase 5: Tech Clock-in & Break Toggle
- Backend:
  - Added clock-in/clock-out and break toggle endpoints to [DayViewSet](../backend/days/views.py):
    - `POST /api/days/{date}/rows/clock-in/` - Add technician to day_rows
    - `POST /api/days/{date}/rows/clock-out/` - Remove technician from day_rows (validates no open seatings)
    - `POST /api/days/{date}/rows/{row_number}/toggle-break/` - Toggle is_on_break flag
  - Clock-in creates new DayRow with sequential row numbers
  - Clock-out renumbers remaining rows and validates no open seatings
  - Break toggle updates is_on_break field and persists to JSON
  - All operations persist changes to day JSON file via [persistence.py](../backend/days/persistence.py)
- Frontend:
  - Completely rewrote [TechTimeDropdown.jsx](../frontend/src/components/TechTimeDropdown.jsx):
    - Loads all technicians from API
    - Auto-detects currently open day
    - Shows tech status indicators (Clocked In, On Break, Clocked Out)
    - Implements Clock In, Clock Out, Break Start, Break Stop actions
    - Visual feedback with color-coded status badges
    - Error handling and validation
  - Updated [TechTimeDropdown.css](../frontend/src/components/TechTimeDropdown.css):
    - Added tech-status styling with color indicators
    - Selected tech highlighting
    - Error and warning message styles
  - Added clock-in, clock-out, and toggle-break methods to [dayService.js](../frontend/src/services/dayService.js)
  - Updated [NavBar.jsx](../frontend/src/components/NavBar.jsx) to handle Tech Time success callbacks

#### Added - Phase 6: Secure Delete
- Backend:
  - Added secure delete endpoint to [DayViewSet](../backend/days/views.py):
    - `POST /api/days/{date}/secure-delete/` - Securely delete closed day files
    - Validates day status is 'closed' before deletion
    - Requires confirmation parameter "DELETE"
    - Uses secure deletion method from [persistence.py](../backend/days/persistence.py)
  - Existing secure delete logic in [persistence.py](../backend/days/persistence.py):
    - Overwrites file with random data before deletion
    - Updates index.db to mark day as 'deleted'
- Frontend:
  - Completely rewrote [DeleteModal.jsx](../frontend/src/components/DeleteModal.jsx):
    - Two-step confirmation process
    - Loads and displays only closed days
    - Shows day summary before deletion
    - Requires typing "DELETE" to confirm
    - Strong warning messages about irreversibility
  - Updated [DeleteModal.css](../frontend/src/components/DeleteModal.css):
    - Day summary styling
    - Final warning section with red alert styling
    - Multi-step UI transitions
    - Info and error message styles
  - Added secure-delete method to [dayService.js](../frontend/src/services/dayService.js)
  - Updated [NavBar.jsx](../frontend/src/components/NavBar.jsx) to handle delete success callbacks

#### Fixed
- Fixed path resolution issues in Docker containers:
  - Updated [views.py](../backend/days/views.py) to use absolute path `/app/data/config.json`
  - Updated [persistence.py](../backend/days/persistence.py) to use absolute path `/app/data/days/`
  - Ensures proper file access in containerized environment
- Fixed data persistence:
  - Day files now correctly saved to `/app/data/days/` in Docker
  - Config file properly loaded from `/app/data/config.json`

#### Testing
- Tested all endpoints in Docker environment:
  - Day creation and file persistence verified
  - Clock-in/clock-out with row renumbering validated
  - Break toggle functionality confirmed
  - Secure delete with file overwriting tested
  - Frontend integration with backend APIs verified

### Phase 4 & 4.5 Implementation - 2026-01-07

#### Added - Phase 4: Day Management - Basic Lifecycle
- Backend:
  - Created [DayViewSet](../backend/days/views.py) with endpoints:
    - `GET /api/days/` - List all days (metadata from index.db)
    - `GET /api/days/{date}/` - Retrieve specific day by date
    - `POST /api/days/` - Create new day with YYYY-MM-DD format
    - `GET /api/days/available_dates/` - List all available day dates
  - Implemented day file existence checking with 409 Conflict response
  - Automatic loading of checklist templates from config.json on day creation
  - DayData structure initialization with metadata, empty day_rows, and checklists
  - Integration with existing [persistence.py](../backend/days/persistence.py) for file operations
  - Registered DayViewSet in [urls.py](../backend/backend/urls.py)
- Frontend:
  - Created [dayService.js](../frontend/src/services/dayService.js) API service
  - Completely rewrote [HomePage.jsx](../frontend/src/pages/HomePage.jsx) with:
    - Day selection view with "New Day" and "Open Day" buttons
    - New Day dialog with date picker (defaults to today)
    - Open Day dialog with list of available days
    - Warning message if day already exists (409 conflict handling)
    - Active day view showing date, status badge, and placeholder for Phase 7
    - Close Day View button to return to selection
  - Created [HomePage.css](../frontend/src/pages/HomePage.css) with:
    - Welcome card styling
    - Day button styling with icons
    - Modal overlay and content styling
    - Day header with status badges
    - Responsive design for mobile devices
- Updated [services/index.js](../frontend/src/services/index.js) to export dayService

#### Added - Phase 4.5: Settings Configuration
- Backend:
  - Created [SettingsViewSet](../backend/days/views.py) with endpoints:
    - `GET /api/settings/checklists/` - Retrieve checklist configuration
    - `PUT /api/settings/checklists/` - Update checklist configuration
  - Full validation for checklist data (must be arrays of strings)
  - Reads/writes to [config.json](../data/config.json)
  - Registered SettingsViewSet in [urls.py](../backend/backend/urls.py)
- Frontend:
  - Created [settingsService.js](../frontend/src/services/settingsService.js) API service
  - Created [SettingsTab.jsx](../frontend/src/components/SettingsTab.jsx) with:
    - New Day Checklist editor
    - End Day Checklist editor
    - Add item functionality with inline form
    - Edit item with inline editing
    - Delete item with confirmation
    - Reorder items (move up/down buttons)
    - Save/loading states with success/error messages
  - Created [SettingsTab.css](../frontend/src/components/SettingsTab.css) with:
    - Two-column grid layout for checklists
    - Item styling with hover effects
    - Icon button styling for actions
    - Responsive design for tablet and mobile
  - Updated [OptionsModal.jsx](../frontend/src/components/OptionsModal.jsx) to:
    - Import and render SettingsTab component
    - Replace "Coming in Phase 4.5" placeholder with actual functionality
- Updated [services/index.js](../frontend/src/services/index.js) to export settingsService

#### Changed
- Replaced HomePage welcome message with functional day management interface
- Status badges now use color-coded styling (green=open, orange=ended, gray=closed)
- Modal dialogs now use consistent styling across the application

#### Technical Details
- Day files stored as YYYY-MM-DD.json in data/days/ directory
- Checklist templates loaded from config.json on day creation
- Each checklist item has text and completed properties
- File-based persistence with DayMetadata in SQLite for quick lookups
- Proper error handling for file operations (FileNotFoundError, ValueError, IOError)
- Backend validation ensures date format is YYYY-MM-DD
- Frontend date picker uses native HTML5 date input
- Settings changes persist to config.json and apply to new days only

#### Testing
- Docker containers rebuilt and started successfully
- Backend logs show no errors
- Frontend builds without errors
- All endpoints registered correctly in Django router
- Ready for manual testing at http://localhost:8010

#### Deliverables
- Phase 4 deliverable complete: Day creation and opening with basic UI ✓
- Phase 4.5 deliverable complete: Full checklist configuration in Settings ✓
- Note: Day table/seating content will be implemented in Phase 7 as per roadmap
- Note: Checklists will be fully integrated with day workflow in Phase 8

### Phase 2 & 3 Implementation - 2026-01-06

#### Added - Phase 2: Color Theme System
- Implemented comprehensive color theme system with three main colors:
  - Primary: #1a1a2e (Deep navy - base UI elements, backgrounds)
  - Secondary: #16213e (Dark blue - secondary UI elements, hover states)
  - Accent: #d4af37 (Gold - call-to-action buttons, highlights)
- Added CSS custom properties in [index.css](../frontend/src/index.css) for consistent theming
- Implemented opacity-based lightening/darkening utilities (--opacity-high, --opacity-medium, --opacity-low, --opacity-subtle, --opacity-faint)
- Created text color variables (--text-primary, --text-secondary, --text-disabled)
- Updated all UI components to use theme variables instead of hardcoded colors
- Applied dark-first design throughout the application

#### Added - Phase 3: Navigation Bar & Options
- Created [NavBar.jsx](../frontend/src/components/NavBar.jsx) component with three main sections:
  - Options button (opens modal with tabs)
  - Tech Time dropdown (UI placeholder for Phase 5)
  - Closed Day Secure Delete button (UI placeholder for Phase 6)
- Implemented [OptionsModal.jsx](../frontend/src/components/OptionsModal.jsx) with tab navigation:
  - Tech Tab for managing technicians
  - Service Tab for managing services
  - Settings tab placeholder (coming in Phase 4.5)
- Created [TechTab.jsx](../frontend/src/components/TechTab.jsx) with full functionality:
  - List all technicians (alias and name)
  - Add new technician form
  - Individual tech detail view
  - Skill management with checkboxes for all services
  - Real-time updates to backend via API
- Created [ServiceTab.jsx](../frontend/src/components/ServiceTab.jsx) with full functionality:
  - List all services (name, time needed, isBonus indicator)
  - Add new service form
  - Individual service detail view
  - Tech assignment with checkboxes for all technicians
  - Real-time updates to backend via API
- Created [TechTimeDropdown.jsx](../frontend/src/components/TechTimeDropdown.jsx) (UI only):
  - Search input for tech lookup by alias/name
  - Radio buttons for Clock In/Out and Break Start/Stop
  - Functionality will be implemented in Phase 5
- Created [DeleteModal.jsx](../frontend/src/components/DeleteModal.jsx) (UI only):
  - Date picker for selecting closed days
  - Multi-step confirmation with typed "DELETE" verification
  - Strong warning messages
  - Functionality will be implemented in Phase 6
- Updated [Layout.jsx](../frontend/src/components/Layout.jsx) to use new NavBar component
- Enhanced [HomePage.jsx](../frontend/src/pages/HomePage.jsx) with:
  - Phase completion status
  - Feature list
  - Quick start guide for users

#### Changed
- Updated [roadmap.md](../roadmap.md) to document chosen color theme values
- Fixed inconsistency: "Accents" → "Accent" for proper naming convention
- Migrated from old header/footer structure to new NavBar layout
- Updated all CSS files to use theme variables exclusively
- Reorganized [App.css](../frontend/src/App.css) to support new layout structure

#### Technical Details
- All components follow dark-first design principles
- No hardcoded colors anywhere in the application
- Opacity-based color variations for consistent hover/focus states
- Full CRUD operations for technicians and services via existing backend APIs
- Many-to-many relationship management (tech skills and service qualifications)
- Responsive modal and dropdown implementations
- Proper event handling and state management

#### Testing
- Tested with Docker containers (docker-compose up --build)
- Verified frontend builds successfully in production mode
- Confirmed no TypeScript/ESLint errors
- Backend API endpoints tested and working
- UI verified at http://localhost:8010

### Notes
- Phase 2 deliverable complete: Themed dark UI with no hardcoded colors ✓
- Phase 3 deliverable complete: Full Options UI with tech/service management ✓
- Tech Time and Delete features are UI-only placeholders as per roadmap specifications
- Ready to proceed to Phase 4: Day Management - Basic Lifecycle
