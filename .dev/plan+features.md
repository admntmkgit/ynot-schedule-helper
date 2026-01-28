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


Day Row Model
    Row id
    Tech Alias
    Tech Name
    isOnBreak
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


Phase 8.1: Fixes
    Bugs:
    - Adding Tech with non-unique alias breaks the backend
    - Tech Time flow changes needed:
        - Auto clock-in when selecting the Tech name if not clocked-in
        - No clock in button needed anymore
        - When clicking the Break Start/Stop and Clock out execute immedately (right now the flow is broken I need to double click it)
        - Submit and Close button no longer needed 
            - Submit not needed with new flow
            - Clock-in flow, Break Start/Stop and Clock-Out should close by itself
            - Clicking outside modal should close too
    Improvements:
    - Service change:
        - new feature: isDefault - all basic service all techs can do
            - the skill checkbox is auto checked for every existing tech on creation
            - the skill checkbox is auto checked when creating new tech
            - allow manual override, do not hardcode it
    - Move the new day checklist above the recommendations
        - expected behavior: dissapears after all checkboxes checked
    - Close Day Summary changes:
        - Two filter modes:
            - current, and then filter ascending rowid
            - switch when clicking the name column header
        - Add Total sum for the Value, After Adjustment, Adjustments columns
        - After day closed still allow to reopen the summary page

Phase 8.2: QoL Display Changes
    - Seating Display
        - Changes to improve the closing flow:
            - when open, double click to open seat closing modal
                Seat Closing Modal (new)
                - value input box: autofocus there for quick value input
                - allow submit by pressing enter
                - auto check value adjustment checkbox if the value is not divisible by 5
            - when open, hold the seat for seat editing
                - allow edit to short_name
                - allow edit time_needed
                - allow edit type isRequested - remember to recalculate the turn types
            - when closed, double click to view details
                - allow changes to value adjustment checkbox
                - allow changes to isRequested checkbox - recalculate the turn types
        - Make the details into one row, make padding smaller, I want the seating display more compact
    - Day Row
        - double click on rowid column or any empty seating column to add seating to chosen tech
        - Remove action column

Phase 8.3: QoL QuickActionBar
    New QuickActionBar to improve the work flow
    - Lookup tech name, then click to open the seating
    - Open Seatings bar with tech name filter
    - From left: Input to lookup by tech name to open seating. Input to filter the tech name for Open Seatings bar. Open seatings bar with Name + Seating Display