"""
Recommendation engine for suggesting technicians
Implements 4-priority scheduling algorithm
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from services.models import Service, TechSkill


class TechRecommendation:
    """Represents a technician recommendation with reasoning"""
    def __init__(self, tech_alias: str, tech_name: str, row_number: int,
                 regular_turns: int, bonus_turns: int, priority_checks: Dict[str, Any]):
        self.tech_alias = tech_alias
        self.tech_name = tech_name
        self.row_number = row_number
        self.regular_turns = regular_turns
        self.bonus_turns = bonus_turns
        self.priority_checks = priority_checks

    def to_dict(self):
        return {
            'tech_alias': self.tech_alias,
            'tech_name': self.tech_name,
            'row_number': self.row_number,
            'regular_turns': self.regular_turns,
            'bonus_turns': self.bonus_turns,
            'priority_checks': self.priority_checks,
        }


def calculate_time_passed_percentage(seating, service_time_needed: int) -> float:
    """
    Calculate percentage of time passed for an open seating
    Returns 0.0 to 1.0 (or > 1.0 if overtime)
    """
    try:
        # Parse the seating time
        seating_time = datetime.fromisoformat(seating.time)
        # Make sure we're comparing timezone-aware datetimes
        if seating_time.tzinfo is None:
            seating_time = seating_time.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        elapsed_minutes = (now - seating_time).total_seconds() / 60
        
        if service_time_needed <= 0:
            return 0.0
        
        return elapsed_minutes / service_time_needed
    except Exception:
        return 0.0


def get_tech_recommendations(day_data, service_name: Optional[str] = None,
                            turn_type: str = 'regular', skip_skill_check: bool = False) -> List[TechRecommendation]:
    """
    Get recommended technicians based on 4-priority algorithm
    
    Parameters:
    - day_data: DayData object with current day's rows and seatings
    - service_name: Optional service name for skill filtering
    - turn_type: 'regular' or 'bonus' - determines which turn count to prioritize
    - skip_skill_check: If True, skip priority #2 (skill check)
    
    Priority Logic:
    1. Tech availability (no open seating OR open seating with >70% time passed)
    2. Tech skill (must have service in skill list) - SKIPPED if skip_skill_check=True
    3. Turn balance (prefer techs with fewer turns of the appropriate type)
    4. Row number (lower row number = higher priority)
    """
    recommendations = []
    
    # Get service info if provided
    service_time_needed = 0
    if service_name:
        try:
            service = Service.objects.get(name=service_name)
            service_time_needed = service.time_needed
        except Service.DoesNotExist:
            pass
    
    for row in day_data.day_rows:
        # Skip disabled rows
        if not getattr(row, 'is_active', True):
            continue
        # Skip techs who are on break
        if row.is_on_break:
            continue
        
        # Priority 1: Check availability
        availability_check = {
            'passed': False,
            'reason': '',
            'open_seatings': 0,
            'time_passed_percentages': []
        }
        
        open_seatings = [s for s in row.seatings if s.value == 0]
        availability_check['open_seatings'] = len(open_seatings)
        
        if len(open_seatings) == 0:
            # No open seatings - tech is available
            availability_check['passed'] = True
            availability_check['reason'] = 'No open seatings'
        else:
            # Has open seatings - check if more than 70% time passed
            all_past_70_percent = True
            for seating in open_seatings:
                # Get the service time for this seating
                seating_service_time = service_time_needed
                if seating.service:
                    try:
                        seating_service = Service.objects.get(name=seating.service)
                        seating_service_time = seating_service.time_needed
                    except Service.DoesNotExist:
                        pass
                
                time_passed_pct = calculate_time_passed_percentage(seating, seating_service_time)
                availability_check['time_passed_percentages'].append({
                    'seating_id': seating.id,
                    'percentage': round(time_passed_pct * 100, 1)
                })
                
                if time_passed_pct < 0.70:
                    all_past_70_percent = False
            
            if all_past_70_percent:
                availability_check['passed'] = True
                availability_check['reason'] = 'All open seatings >70% time passed'
            else:
                availability_check['reason'] = 'Has open seatings with <70% time passed'
        
        # Priority 2: Check skill (if not skipped)
        skill_check = {
            'passed': True,  # Default to True if skipped
            'reason': 'Skill check skipped',
            'has_skill': None
        }
        
        if not skip_skill_check and service_name:
            has_skill = TechSkill.objects.filter(
                tech_alias=row.tech_alias,
                service_name=service_name
            ).exists()
            
            skill_check['passed'] = has_skill
            skill_check['has_skill'] = has_skill
            skill_check['reason'] = 'Has required skill' if has_skill else 'Missing required skill'

        # If availability failed, don't recommend this tech at all
        if not availability_check['passed']:
            continue

        # If skill check is required and tech lacks the skill, don't recommend
        if (not skip_skill_check) and service_name and (not skill_check.get('has_skill', True)):
            continue
        
        # Priority 3: Turn balance
        # Record both counts but use only the requested turn_type when ranking
        turn_balance_check = {
            'requested_turn_type': turn_type,
            'regular_turns': row.regular_turns,
            'bonus_turns': row.bonus_turns,
            'turn_count_used': row.bonus_turns if turn_type == 'bonus' else row.regular_turns,
        }
        
        # Priority 4: Row number
        row_priority_check = {
            'row_number': row.row_number,
        }
        
        # Create recommendation
        priority_checks = {
            'availability': availability_check,
            'skill': skill_check,
            'turn_balance': turn_balance_check,
            'row_priority': row_priority_check,
        }
        
        recommendations.append(TechRecommendation(
            tech_alias=row.tech_alias,
            tech_name=row.tech_name,
            row_number=row.row_number,
            regular_turns=row.regular_turns,
            bonus_turns=row.bonus_turns,
            priority_checks=priority_checks
        ))
    
    # Sort by priorities (in order of importance)
    # 1. Availability (passed first)
    # 2. Skill (passed first) - only if not skipped
    # 3. Turn balance (fewer turns first)
    # 4. Row number (lower first)
    def sort_key(rec):
        availability_score = 1 if rec.priority_checks['availability']['passed'] else 0
        skill_score = 1 if rec.priority_checks['skill']['passed'] else 0
        # Use only the requested turn count (do not mix regular/bonus)
        if rec.priority_checks['turn_balance']['requested_turn_type'] == 'bonus':
            turn_count = rec.priority_checks['turn_balance']['bonus_turns']
        else:
            turn_count = rec.priority_checks['turn_balance']['regular_turns']
        row_number = rec.row_number

        # Return tuple for sorting (higher priority = lower sort value)
        # Negative for availability and skill to sort True (1) before False (0)
        return (-availability_score, -skill_score, turn_count, row_number)
    
    recommendations.sort(key=sort_key)
    
    return recommendations
