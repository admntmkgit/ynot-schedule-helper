from django.db import models
from datetime import datetime
import uuid


class DayMetadata(models.Model):
    """Metadata about days stored in index.db for quick lookups"""
    date = models.DateField(primary_key=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('open', 'Open'),
            ('ended', 'Ended'),
            ('closed', 'Closed'),
            ('deleted', 'Deleted'),
        ],
        default='open'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    file_path = models.CharField(max_length=500)

    class Meta:
        db_table = 'day_metadata'
        ordering = ['-date']

    def __str__(self):
        return f"{self.date} - {self.status}"


# The following classes are NOT Django models - they're data structures
# for file-based persistence and will be serialized to/from JSON

class Seating:
    """Seating data structure (not a Django model, used for JSON persistence)"""
    def __init__(self, id=None, is_requested=False, is_bonus=False, service='', 
                 time=None, value=0, has_value_penalty=False, short_name='', time_needed=None):
        self.id = id or str(uuid.uuid4())
        self.is_requested = is_requested
        self.is_bonus = is_bonus
        self.service = service
        self.short_name = short_name
        self.time_needed = time_needed
        # Use timezone-aware ISO format so clients parse times correctly across zones
        try:
            default_time = datetime.now().astimezone().isoformat()
        except Exception:
            default_time = datetime.now().isoformat()
        self.time = time or default_time
        self.value = value
        self.has_value_penalty = has_value_penalty

    def to_dict(self):
        return {
            'id': self.id,
            'is_requested': self.is_requested,
            'is_bonus': self.is_bonus,
            'service': self.service,
            'short_name': self.short_name,
            'time': self.time,
            'time_needed': self.time_needed,
            'value': self.value,
            'has_value_penalty': self.has_value_penalty,
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data.get('id'),
            is_requested=data.get('is_requested', False),
            is_bonus=data.get('is_bonus', False),
            service=data.get('service', ''),
            short_name=data.get('short_name', ''),
            time=data.get('time'),
            time_needed=data.get('time_needed'),
            value=data.get('value', 0),
            has_value_penalty=data.get('has_value_penalty', False),
        )


class DayRow:
    """DayRow data structure (not a Django model, used for JSON persistence)"""
    def __init__(self, row_number=1, tech_alias='', tech_name='', seatings=None,
                 regular_turns=0, bonus_turns=0, is_on_break=False, is_active=True):
        self.row_number = row_number
        self.tech_alias = tech_alias
        self.tech_name = tech_name
        self.seatings = seatings or []
        self.regular_turns = regular_turns
        self.bonus_turns = bonus_turns
        self.is_on_break = is_on_break
        self.is_active = is_active

    def to_dict(self):
        return {
            'row_number': self.row_number,
            'tech_alias': self.tech_alias,
            'tech_name': self.tech_name,
            'seatings': [s.to_dict() if isinstance(s, Seating) else s for s in self.seatings],
            'regular_turns': self.regular_turns,
            'bonus_turns': self.bonus_turns,
            'is_on_break': self.is_on_break,
            'is_active': self.is_active,
        }

    @classmethod
    def from_dict(cls, data):
        seatings_data = data.get('seatings', [])
        seatings = [Seating.from_dict(s) if isinstance(s, dict) else s for s in seatings_data]
        return cls(
            row_number=data.get('row_number', 1),
            tech_alias=data.get('tech_alias', ''),
            tech_name=data.get('tech_name', ''),
            seatings=seatings,
            regular_turns=data.get('regular_turns', 0),
            bonus_turns=data.get('bonus_turns', 0),
            is_on_break=data.get('is_on_break', False),
            is_active=data.get('is_active', True),
        )

    def add_seating(self, seating):
        """Add a seating and update turn counts"""
        self.seatings.append(seating)
        if seating.is_bonus:
            self.bonus_turns += 1
        else:
            self.regular_turns += 1

    def remove_seating(self, seating_id):
        """Remove a seating by ID and update turn counts"""
        for i, seating in enumerate(self.seatings):
            if seating.id == seating_id:
                removed = self.seatings.pop(i)
                if removed.is_bonus:
                    self.bonus_turns = max(0, self.bonus_turns - 1)
                else:
                    self.regular_turns = max(0, self.regular_turns - 1)
                return removed
        return None


class DayData:
    """DayData data structure (not a Django model, used for JSON persistence)"""
    def __init__(self, date='', status='open', day_rows=None, new_day_checklist=None,
                 end_day_checklist=None, created_at=None, closed_at=None):
        self.date = date
        self.status = status
        self.day_rows = day_rows or []
        self.new_day_checklist = new_day_checklist or []
        self.end_day_checklist = end_day_checklist or []
        self.created_at = created_at or datetime.now().isoformat()
        self.closed_at = closed_at

    def to_dict(self):
        return {
            'date': self.date,
            'status': self.status,
            'day_rows': [r.to_dict() if isinstance(r, DayRow) else r for r in self.day_rows],
            'new_day_checklist': self.new_day_checklist,
            'end_day_checklist': self.end_day_checklist,
            'created_at': self.created_at,
            'closed_at': self.closed_at,
        }

    @classmethod
    def from_dict(cls, data):
        day_rows_data = data.get('day_rows', [])
        day_rows = [DayRow.from_dict(r) if isinstance(r, dict) else r for r in day_rows_data]
        return cls(
            date=data.get('date', ''),
            status=data.get('status', 'open'),
            day_rows=day_rows,
            new_day_checklist=data.get('new_day_checklist', []),
            end_day_checklist=data.get('end_day_checklist', []),
            created_at=data.get('created_at'),
            closed_at=data.get('closed_at'),
        )

    def get_row_by_tech(self, tech_alias):
        """Get a DayRow by tech alias"""
        for row in self.day_rows:
            if row.tech_alias == tech_alias:
                return row
        return None

    def add_row(self, tech_alias, tech_name=''):
        """Add a new row for a tech (clock-in).

        If a previously disabled row for the tech exists, re-enable it and assign
        a visible row_number (active rows are numbered sequentially). If an
        active row already exists, return None to indicate conflict.
        """
        existing = self.get_row_by_tech(tech_alias)
        # If an active row exists, signal caller that it already exists
        if existing and getattr(existing, 'is_active', True):
            return None

        # If a disabled row exists, re-enable it and keep its original row_number
        if existing and not getattr(existing, 'is_active', True):
            existing.is_active = True
            if tech_name:
                existing.tech_name = tech_name
            return existing

        # Create a brand new active row. Preserve the original behavior: append
        # to the end using the total number of rows (including disabled ones).
        row_number = len(self.day_rows) + 1
        new_row = DayRow(row_number=row_number, tech_alias=tech_alias, tech_name=tech_name)
        self.day_rows.append(new_row)
        return new_row

