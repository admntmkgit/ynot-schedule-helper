from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import datetime, date
import json
from pathlib import Path

from .models import DayMetadata, DayData
from .serializers import DayMetadataSerializer, DayDataSerializer
from .persistence import day_persistence
from .recommendation import get_tech_recommendations


class DayViewSet(viewsets.ViewSet):
    """
    ViewSet for Day management
    Handles day creation, retrieval, and listing
    """

    def list(self, request):
        """
        GET /api/days/
        List all days (from metadata)
        """
        days = DayMetadata.objects.all()
        serializer = DayMetadataSerializer(days, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """
        GET /api/days/{date}/
        Retrieve a specific day by date (YYYY-MM-DD)
        """
        try:
            # Load day data from JSON file
            day_data = day_persistence.load(pk)
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data)
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request):
        """
        POST /api/days/
        Create a new day
        Body: { "date": "YYYY-MM-DD" }
        """
        date_str = request.data.get('date')
        
        if not date_str:
            return Response(
                {'error': 'Date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate date format
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Expected YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if day already exists
        if day_persistence.exists(date_str):
            return Response(
                {
                    'error': f'Day {date_str} already exists',
                    'warning': 'A file for this date already exists. Please open it instead or choose a different date.'
                },
                status=status.HTTP_409_CONFLICT
            )
        
        try:
            # Load checklist templates from config.json
            # In Docker, backend is at /app, so data is at /app/data
            config_path = Path('/app/data/config.json')
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            new_day_checklist = [
                {'text': item, 'completed': False}
                for item in config.get('new_day_checklist', [])
            ]
            end_day_checklist = [
                {'text': item, 'completed': False}
                for item in config.get('end_day_checklist', [])
            ]
            
            # Create new DayData
            day_data = DayData(
                date=date_str,
                status='open',
                day_rows=[],
                new_day_checklist=new_day_checklist,
                end_day_checklist=end_day_checklist,
            )
            
            # Save to file
            day_persistence.save(day_data, update_metadata=True)
            
            # Return the created day
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to create day: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def available_dates(self, request):
        """
        GET /api/days/available_dates/
        List all available day dates
        """
        try:
            dates = day_persistence.list_days()
            return Response({'dates': dates})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='secure-delete')
    def secure_delete(self, request, pk=None):
        """
        POST /api/days/{date}/secure-delete/
        Securely delete a closed day file
        Body: { "confirmation": "DELETE" }
        """
        confirmation = request.data.get('confirmation')
        
        if confirmation != 'DELETE':
            return Response(
                {'error': 'Confirmation required. Send {"confirmation": "DELETE"}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Load day data to check status
            day_data = day_persistence.load(pk)
            
            # Only allow deletion of closed days
            if day_data.status != 'closed':
                return Response(
                    {'error': f'Can only delete closed days. Current status: {day_data.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Perform secure delete
            success = day_persistence.delete(pk, secure=True)
            
            if success:
                return Response({
                    'message': f'Day {pk} has been securely deleted',
                    'date': pk
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Failed to delete day file'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='rows/clock-in')
    def clock_in(self, request, pk=None):
        """
        POST /api/days/{date}/rows/clock-in/
        Clock in a technician (add them to day_rows)
        Body: { "tech_alias": "alias", "tech_name": "name" }
        """
        tech_alias = request.data.get('tech_alias')
        tech_name = request.data.get('tech_name', '')
        
        if not tech_alias:
            return Response(
                {'error': 'tech_alias is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Load day data
            day_data = day_persistence.load(pk)
            
            # Check if tech is already clocked in (active)
            existing = day_data.get_row_by_tech(tech_alias)
            if existing and getattr(existing, 'is_active', True):
                return Response(
                    {'error': f'Tech {tech_alias} is already clocked in'},
                    status=status.HTTP_409_CONFLICT
                )

            # Add new row or re-enable an existing disabled row
            new_row = day_data.add_row(tech_alias, tech_name)
            
            # Save the updated day
            day_persistence.save(day_data)
            
            # Return the updated day
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='rows/clock-out')
    def clock_out(self, request, pk=None):
        """
        POST /api/days/{date}/rows/clock-out/
        Clock out a technician (remove them from day_rows)
        Body: { "tech_alias": "alias" }
        """
        tech_alias = request.data.get('tech_alias')
        
        if not tech_alias:
            return Response(
                {'error': 'tech_alias is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Load day data
            day_data = day_persistence.load(pk)
            
            # Find the row
            row = day_data.get_row_by_tech(tech_alias)
            if not row or not getattr(row, 'is_active', True):
                return Response(
                    {'error': f'Tech {tech_alias} is not clocked in'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Check if tech has open seatings
            open_seatings = [s for s in row.seatings if s.value == 0]
            if open_seatings:
                return Response(
                    {'error': f'Cannot clock out: Tech {tech_alias} has {len(open_seatings)} open seating(s)'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Disable the row instead of removing it. Preserve its original row_number
            # so the position can be reinstated when re-enabled.
            row.is_active = False

            # Save the updated day
            day_persistence.save(day_data)
            
            # Return the updated day
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='rows/(?P<row_number>[0-9]+)/toggle-break')
    def toggle_break(self, request, pk=None, row_number=None):
        """
        POST /api/days/{date}/rows/{row_number}/toggle-break/
        Toggle break status for a technician
        """
        if not row_number:
            return Response(
                {'error': 'row_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            row_num = int(row_number)
            
            # Load day data
            day_data = day_persistence.load(pk)
            
            # Find the row by number
            row = None
            for r in day_data.day_rows:
                if r.row_number == row_num:
                    row = r
                    break
            
            if not row:
                return Response(
                    {'error': f'Row {row_num} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Toggle break status
            row.is_on_break = not row.is_on_break
            
            # Save the updated day
            day_persistence.save(day_data)
            
            # Return the updated day
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError:
            return Response(
                {'error': 'Invalid row_number'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['delete'], url_path='rows/(?P<row_number>[0-9]+)')
    def delete_row(self, request, pk=None, row_number=None):
        """
        DELETE /api/days/{date}/rows/{row_number}/
        Delete a day row and resequence remaining rows
        - Validates no open seatings exist
        - Clocks out the tech
        - Removes the row
        - Resequences all remaining row numbers (no gaps)
        """
        if not row_number:
            return Response(
                {'error': 'row_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            row_num = int(row_number)
            
            # Load day data
            day_data = day_persistence.load(pk)
            
            # Find the row by number
            row_to_delete = None
            for r in day_data.day_rows:
                if r.row_number == row_num:
                    row_to_delete = r
                    break
            
            if not row_to_delete:
                return Response(
                    {'error': f'Row {row_num} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate no open seatings
            open_seatings = [s for s in row_to_delete.seatings if s.value == 0]
            if open_seatings:
                return Response(
                    {'error': f'Cannot delete row: Tech has {len(open_seatings)} open seating(s)'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Remove the row
            day_data.day_rows.remove(row_to_delete)
            
            # Resequence all row numbers (no gaps)
            for idx, row in enumerate(day_data.day_rows, start=1):
                row.row_number = idx
            
            # Save the updated day
            day_persistence.save(day_data)
            
            # Return the updated day
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError:
            return Response(
                {'error': 'Invalid row_number'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['put'], url_path='rows/reorder')
    def reorder_rows(self, request, pk=None):
        """
        PUT /api/days/{date}/rows/reorder/
        Reorder day rows by moving a row to a new position
        Body: { "tech_alias": "alias", "new_row_number": 2 }
        All rows are resequenced to maintain sort by row_number
        """
        tech_alias = request.data.get('tech_alias')
        new_row_number = request.data.get('new_row_number')
        
        if not tech_alias:
            return Response(
                {'error': 'tech_alias is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_row_number is None:
            return Response(
                {'error': 'new_row_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_row_number = int(new_row_number)
            
            # Load day data
            day_data = day_persistence.load(pk)
            
            # Find the row to move
            row_to_move = None
            for r in day_data.day_rows:
                if r.tech_alias == tech_alias:
                    row_to_move = r
                    break
            
            if not row_to_move:
                return Response(
                    {'error': f'Tech {tech_alias} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate new position
            if new_row_number < 1 or new_row_number > len(day_data.day_rows):
                return Response(
                    {'error': f'Invalid new_row_number: must be between 1 and {len(day_data.day_rows)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get current position
            current_position = row_to_move.row_number
            
            if current_position == new_row_number:
                # No change needed
                serializer = DayDataSerializer(day_data)
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            # Remove from current position
            day_data.day_rows.remove(row_to_move)
            
            # Insert at new position (convert to 0-based index)
            day_data.day_rows.insert(new_row_number - 1, row_to_move)
            
            # Resequence all row numbers
            for idx, row in enumerate(day_data.day_rows, start=1):
                row.row_number = idx
            
            # Save the updated day
            day_persistence.save(day_data)
            
            # Return the updated day
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError:
            return Response(
                {'error': 'Invalid new_row_number: must be an integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='seatings')
    def create_seating(self, request, pk=None):
        """
        POST /api/days/{date}/seatings/
        Create a new seating for a tech
        Body: { 
            "tech_alias": "alias", 
            "is_requested": true/false, 
            "service": "service_name" 
        }
        """
        from technicians.models import Technician
        from services.models import Service, TechSkill
        
        tech_alias = request.data.get('tech_alias')
        is_requested = request.data.get('is_requested', False)
        service_name = request.data.get('service')
        
        if not tech_alias or not service_name:
            return Response(
                {'error': 'tech_alias and service are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Load day data
            day_data = day_persistence.load(pk)
            
            # Find the tech's row
            row = day_data.get_row_by_tech(tech_alias)
            if not row:
                return Response(
                    {'error': f'Tech {tech_alias} is not clocked in'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate tech is not on break
            if row.is_on_break:
                return Response(
                    {'error': f'Tech {tech_alias} is currently on break'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate service exists
            try:
                service = Service.objects.get(name=service_name)
            except Service.DoesNotExist:
                return Response(
                    {'error': f'Service {service_name} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate tech has skill for service
            if not TechSkill.objects.filter(tech_alias=tech_alias, service_name=service_name).exists():
                return Response(
                    {'error': f'Tech {tech_alias} does not have skill for service {service_name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create the seating (include service short_name for UI)
            from .models import Seating
            new_seating = Seating(
                is_requested=is_requested,
                is_bonus=False,
                service=service_name,
                short_name=service.short_name
            )

            # Add seating to row then recompute turn types for entire row
            row.add_seating(new_seating)
            self._recompute_row_turns(row)

            # Save the updated day
            day_persistence.save(day_data)
            
            # Return the updated day
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _determine_bonus_turn(self, row, is_requested, service_is_bonus):
        """
        Determine if a seating should count as a bonus turn
        Logic:
        - If requested: alternates - 1st=regular, 2nd=bonus, 3rd=regular, 4th=bonus, etc.
        - If not requested: based on service.is_bonus
        """
        if is_requested:
            # Count how many requested seatings this tech already has
            requested_count = sum(1 for s in row.seatings if s.is_requested)
            # Alternate: even indices (0,2,4...) = regular, odd indices (1,3,5...) = bonus
            return requested_count % 2 == 1
        else:
            # For walk-ins, use the service's is_bonus flag
            return service_is_bonus

    def _recompute_row_turns(self, row):
        """
        Recompute `is_bonus` flags for all seatings in `row.seatings` and
        update `regular_turns` / `bonus_turns` accordingly.

        Rules:
        - Requested seatings alternate: 1st requested = regular, 2nd = bonus, etc.
        - Walk-ins use their service.is_bonus flag.
        """
        from services.models import Service

        requested_seen = 0
        regular_count = 0
        bonus_count = 0

        for idx, seating in enumerate(row.seatings):
            if seating.is_requested:
                # Alternate requested seatings: first = regular (False), second = bonus (True)
                is_bonus = (requested_seen % 2 == 1)
                seating.is_bonus = bool(is_bonus)
                requested_seen += 1
            else:
                # Walk-ins follow service.is_bonus
                try:
                    svc = Service.objects.get(name=seating.service)
                    seating.is_bonus = bool(svc.is_bonus)
                except Service.DoesNotExist:
                    seating.is_bonus = False

            if seating.is_bonus:
                bonus_count += 1
            else:
                regular_count += 1

        row.regular_turns = regular_count
        row.bonus_turns = bonus_count

    @action(detail=True, methods=['put'], url_path='seatings/(?P<seating_id>[^/.]+)/update')
    def update_seating(self, request, pk=None, seating_id=None):
        """
        PUT /api/days/{date}/seatings/{seating_id}/
        Update a seating (close it, edit details)
        Body: { "value": 50, "has_value_penalty": false }
        """
        if not seating_id:
            return Response(
                {'error': 'seating_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Load day data
            day_data = day_persistence.load(pk)
            
            # Find the seating
            target_row = None
            target_seating = None
            
            for row in day_data.day_rows:
                for seating in row.seatings:
                    if seating.id == seating_id:
                        target_row = row
                        target_seating = seating
                        break
                if target_seating:
                    break
            
            if not target_seating:
                return Response(
                    {'error': f'Seating {seating_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update seating fields
            if 'value' in request.data:
                target_seating.value = int(request.data['value'])
            
            if 'has_value_penalty' in request.data:
                target_seating.has_value_penalty = bool(request.data['has_value_penalty'])
            
            if 'is_requested' in request.data:
                target_seating.is_requested = bool(request.data['is_requested'])
            
            if 'service' in request.data:
                from services.models import Service, TechSkill
                new_service_name = request.data['service']
                
                # Validate service exists
                try:
                    service = Service.objects.get(name=new_service_name)
                except Service.DoesNotExist:
                    return Response(
                        {'error': f'Service {new_service_name} not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Validate tech has skill
                if not TechSkill.objects.filter(tech_alias=target_row.tech_alias, service_name=new_service_name).exists():
                    return Response(
                        {'error': f'Tech {target_row.tech_alias} does not have skill for service {new_service_name}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                target_seating.service = new_service_name
                target_seating.short_name = service.short_name
            # Allow per-seating short_name and time_needed overrides
            if 'short_name' in request.data:
                target_seating.short_name = request.data.get('short_name') or ''

            if 'time_needed' in request.data:
                try:
                    target_seating.time_needed = int(request.data.get('time_needed'))
                except Exception:
                    target_seating.time_needed = None
            # After any seating edit that might affect turn types, recompute the whole row
            self._recompute_row_turns(target_row)

            # Save the updated day
            day_persistence.save(day_data)
            
            # Return the updated day
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response(
                {'error': f'Invalid value: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['delete'], url_path='seatings/(?P<seating_id>[^/.]+)')
    def delete_seating(self, request, pk=None, seating_id=None):
        """
        DELETE /api/days/{date}/seatings/{seating_id}/
        Delete a seating
        """
        if not seating_id:
            return Response(
                {'error': 'seating_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Load day data
            day_data = day_persistence.load(pk)
            
            # Find and remove the seating
            found = False
            for row in day_data.day_rows:
                removed = row.remove_seating(seating_id)
                if removed:
                    found = True

                    # After removing a seating, recompute is_bonus for the whole row
                    self._recompute_row_turns(row)
                    break
            
            if not found:
                return Response(
                    {'error': f'Seating {seating_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Save the updated day
            day_persistence.save(day_data)
            
            # Return the updated day
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get', 'post'], url_path='checklist')
    def checklist(self, request, pk=None):
        """
        GET /api/days/{date}/checklist/
        Get checklist items with completion status
        
        POST /api/days/{date}/checklist/
        Mark a checklist item as complete
        Body: { "checklist_type": "new_day" | "end_day", "index": 0 }
        """
        try:
            # Load day data
            day_data = day_persistence.load(pk)
            
            if request.method == 'GET':
                # Return both checklists
                return Response({
                    'new_day_checklist': day_data.new_day_checklist,
                    'end_day_checklist': day_data.end_day_checklist,
                })
            
            elif request.method == 'POST':
                # Mark an item as complete
                checklist_type = request.data.get('checklist_type')
                index = request.data.get('index')
                
                if not checklist_type or index is None:
                    return Response(
                        {'error': 'checklist_type and index are required'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                if checklist_type not in ['new_day', 'end_day']:
                    return Response(
                        {'error': 'checklist_type must be "new_day" or "end_day"'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Get the appropriate checklist
                if checklist_type == 'new_day':
                    checklist = day_data.new_day_checklist
                else:
                    checklist = day_data.end_day_checklist
                
                # Validate index
                try:
                    index = int(index)
                    if index < 0 or index >= len(checklist):
                        return Response(
                            {'error': f'Invalid index: {index}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except (ValueError, TypeError):
                    return Response(
                        {'error': 'Index must be a valid integer'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Toggle completion status
                checklist[index]['completed'] = not checklist[index].get('completed', False)
                
                # Save the updated day
                day_persistence.save(day_data)
                
                # Return updated checklists
                return Response({
                    'new_day_checklist': day_data.new_day_checklist,
                    'end_day_checklist': day_data.end_day_checklist,
                })
        
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='summary')
    def summary(self, request, pk=None):
        """
        GET /api/days/{date}/summary/
        Calculate day-end summary with value penalty logic
        Includes all technicians (both clocked-in and absent techs for easier data entry)
        Returns: {
            "tech_stats": [
                {
                    "tech_alias": "alias",
                    "tech_name": "name",
                    "row_number": 1 or null (null if absent),
                    "total_value_without_penalty": 150,
                    "total_value_with_penalty": 147,
                    "penalty_count": 1,
                    "regular_turns": 3,
                    "bonus_turns": 2,
                    "is_absent": false
                }
            ],
            "all_seatings_closed": true,
            "new_day_checklist_complete": true,
            "end_day_checklist_complete": false
        }
        """
        try:
            # Load day data
            day_data = day_persistence.load(pk)
            
            tech_stats = []
            all_seatings_closed = True
            
            # Build a map of clocked-in techs from day_rows
            clocked_in_techs = {}
            for row in day_data.day_rows:
                # Skip inactive (clocked-out) techs
                if not getattr(row, 'is_active', True):
                    continue
                
                clocked_in_techs[row.tech_alias] = row
            
            # Get all technicians from the system
            from technicians.models import Technician
            all_techs = Technician.objects.all()
            
            for tech in all_techs:
                if tech.alias in clocked_in_techs:
                    # Tech was clocked in - calculate their stats
                    row = clocked_in_techs[tech.alias]
                    
                    total_without_penalty = 0
                    total_with_penalty = 0
                    penalty_count = 0
                    
                    for seating in row.seatings:
                        # Check if any seatings are still open
                        if seating.value == 0:
                            all_seatings_closed = False
                        
                        # Calculate totals
                        total_without_penalty += seating.value
                        
                        # Apply penalty if flagged (-3 value)
                        if seating.has_value_penalty:
                            penalty_count += 1
                            total_with_penalty += max(0, seating.value - 3)
                        else:
                            total_with_penalty += seating.value
                    
                    tech_stats.append({
                        'tech_alias': row.tech_alias,
                        'tech_name': row.tech_name,
                        'row_number': row.row_number,
                        'total_value_without_penalty': total_without_penalty,
                        'total_value_with_penalty': total_with_penalty,
                        'penalty_count': penalty_count,
                        'regular_turns': row.regular_turns,
                        'bonus_turns': row.bonus_turns,
                        'is_absent': False,
                    })
                else:
                    # Tech was absent - add with zeros
                    tech_stats.append({
                        'tech_alias': tech.alias,
                        'tech_name': tech.name,
                        'row_number': None,
                        'total_value_without_penalty': 0,
                        'total_value_with_penalty': 0,
                        'penalty_count': 0,
                        'regular_turns': 0,
                        'bonus_turns': 0,
                        'is_absent': True,
                    })
            
            # Check if checklists are complete
            new_day_checklist_complete = all(
                item.get('completed', False) 
                for item in day_data.new_day_checklist
            )
            end_day_checklist_complete = all(
                item.get('completed', False) 
                for item in day_data.end_day_checklist
            )
            
            return Response({
                'tech_stats': tech_stats,
                'all_seatings_closed': all_seatings_closed,
                'new_day_checklist_complete': new_day_checklist_complete,
                'end_day_checklist_complete': end_day_checklist_complete,
            })
        
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='end-day')
    def end_day(self, request, pk=None):
        """
        POST /api/days/{date}/end-day/
        Mark day as ended (moves to 'ended' status)
        """
        try:
            # Load day data
            day_data = day_persistence.load(pk)
            
            # Check current status
            if day_data.status != 'open':
                return Response(
                    {'error': f'Day is already {day_data.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update status to 'ended'
            day_data.status = 'ended'
            
            # Save the updated day
            day_persistence.save(day_data, update_metadata=True)
            
            # Return the updated day
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='close-day')
    def close_day(self, request, pk=None):
        """
        POST /api/days/{date}/close-day/
        Close the day (final status, disables edits)
        Validates:
        - All seatings are closed
        - End day checklist is complete
        """
        try:
            # Load day data
            day_data = day_persistence.load(pk)
            
            # Check current status
            if day_data.status == 'closed':
                return Response(
                    {'error': 'Day is already closed'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate all seatings are closed
            all_seatings_closed = True
            for row in day_data.day_rows:
                for seating in row.seatings:
                    if seating.value == 0:
                        all_seatings_closed = False
                        break
                if not all_seatings_closed:
                    break
            
            if not all_seatings_closed:
                return Response(
                    {'error': 'Cannot close day: Some seatings are still open'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate end day checklist is complete
            end_day_checklist_complete = all(
                item.get('completed', False) 
                for item in day_data.end_day_checklist
            )
            
            if not end_day_checklist_complete:
                return Response(
                    {'error': 'Cannot close day: End day checklist is not complete'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Close the day
            day_data.status = 'closed'
            day_data.closed_at = datetime.now().isoformat()
            
            # Save the updated day
            day_persistence.save(day_data, update_metadata=True)
            
            # Return the updated day
            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='recommend')
    def recommend(self, request, pk=None):
        """
        GET /api/days/{date}/recommend/
        Get technician recommendations for the current day
        Query params:
        - service: Optional service name (for service-specific recommendations)
        - turn_type: 'regular' or 'bonus' (default: 'regular')
        - skip_skill_check: 'true' or 'false' (default: 'false')
        
        Returns sorted list of recommended techs with reasoning
        """
        try:
            # Load day data
            day_data = day_persistence.load(pk)
            
            # Parse query params
            service_name = request.query_params.get('service', None)
            turn_type = request.query_params.get('turn_type', 'regular')
            skip_skill_check = request.query_params.get('skip_skill_check', 'false').lower() == 'true'
            
            # Validate turn_type
            if turn_type not in ['regular', 'bonus']:
                return Response(
                    {'error': 'turn_type must be "regular" or "bonus"'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get recommendations
            recommendations = get_tech_recommendations(
                day_data=day_data,
                service_name=service_name,
                turn_type=turn_type,
                skip_skill_check=skip_skill_check
            )
            
            # Convert to dict format
            recommendations_data = [rec.to_dict() for rec in recommendations]
            
            return Response({
                'recommendations': recommendations_data,
                'service': service_name,
                'turn_type': turn_type,
                'skip_skill_check': skip_skill_check,
            })
        
        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='unfreeze')
    def unfreeze(self, request, pk=None):
        """
        POST /api/days/{date}/unfreeze/
        Re-open a day that was marked 'ended' (allow further edits).
        Not allowed if day is 'open' or 'closed'.
        """
        try:
            day_data = day_persistence.load(pk)

            if day_data.status != 'ended':
                return Response(
                    {'error': f'Day must be in ended state to unfreeze (current: {day_data.status})'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Set back to open so edits are possible
            day_data.status = 'open'
            # clear any closed_at metadata
            day_data.closed_at = None

            day_persistence.save(day_data, update_metadata=True)

            serializer = DayDataSerializer(day_data)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except FileNotFoundError:
            return Response(
                {'error': f'Day {pk} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SettingsViewSet(viewsets.ViewSet):
    """
    ViewSet for Settings management
    Handles checklist configuration
    """

    def retrieve(self, request, pk=None):
        """
        GET /api/settings/{checklists|day-table}/
        Retrieve settings configuration
        """
        try:
            config_path = Path('/app/data/config.json')
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)

            # Support different setting collections by pk
            if pk == 'checklists':
                return Response({
                    'new_day_checklist': config.get('new_day_checklist', []),
                    'end_day_checklist': config.get('end_day_checklist', []),
                })

            if pk == 'day-table' or pk == 'day_table' or pk is None:
                # default day table settings
                day_table = config.get('day_table', {
                    'display_name': True,
                    'display_turns': False,
                })
                return Response(day_table)

            if pk == 'recommendations':
                # Recommendation widget settings
                recommendation_widgets = config.get('recommendation_widgets', [])
                return Response({
                    'recommendation_widgets': recommendation_widgets
                })

            return Response({'error': 'Unknown settings key'}, status=status.HTTP_404_NOT_FOUND)

        except FileNotFoundError:
            return Response(
                {'error': 'Configuration file not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, pk=None):
        """
        PUT /api/settings/{checklists|day-table}/
        Update settings configuration
        """
        try:
            # Load existing config
            config_path = Path('/app/data/config.json')
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)

            if pk == 'checklists':
                new_day_checklist = request.data.get('new_day_checklist')
                end_day_checklist = request.data.get('end_day_checklist')

                # Validation
                if new_day_checklist is not None and not isinstance(new_day_checklist, list):
                    return Response(
                        {'error': 'new_day_checklist must be a list'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if end_day_checklist is not None and not isinstance(end_day_checklist, list):
                    return Response(
                        {'error': 'end_day_checklist must be a list'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Validate all items are strings
                if new_day_checklist is not None:
                    if not all(isinstance(item, str) for item in new_day_checklist):
                        return Response(
                            {'error': 'All checklist items must be strings'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                if end_day_checklist is not None:
                    if not all(isinstance(item, str) for item in end_day_checklist):
                        return Response(
                            {'error': 'All checklist items must be strings'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                # Update checklists
                if new_day_checklist is not None:
                    config['new_day_checklist'] = new_day_checklist

                if end_day_checklist is not None:
                    config['end_day_checklist'] = end_day_checklist

                # Save config
                with open(config_path, 'w', encoding='utf-8') as f:
                    json.dump(config, f, indent=2, ensure_ascii=False)

                return Response({
                    'new_day_checklist': config.get('new_day_checklist', []),
                    'end_day_checklist': config.get('end_day_checklist', []),
                })

            if pk == 'day-table' or pk == 'day_table':
                # Expect body: { display_name: bool, display_turns: bool }
                display_name = request.data.get('display_name')
                display_turns = request.data.get('display_turns')

                if display_name is not None and not isinstance(display_name, bool):
                    return Response({'error': 'display_name must be boolean'}, status=status.HTTP_400_BAD_REQUEST)
                if display_turns is not None and not isinstance(display_turns, bool):
                    return Response({'error': 'display_turns must be boolean'}, status=status.HTTP_400_BAD_REQUEST)

                day_table = config.get('day_table', {})
                if display_name is not None:
                    day_table['display_name'] = display_name
                if display_turns is not None:
                    day_table['display_turns'] = display_turns

                config['day_table'] = day_table

                # Save config
                with open(config_path, 'w', encoding='utf-8') as f:
                    json.dump(config, f, indent=2, ensure_ascii=False)

                return Response(config['day_table'])

            if pk == 'recommendations':
                # Expect body: { recommendation_widgets: [service_name, ...] }
                recommendation_widgets = request.data.get('recommendation_widgets')

                if recommendation_widgets is not None:
                    if not isinstance(recommendation_widgets, list):
                        return Response(
                            {'error': 'recommendation_widgets must be a list'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Validate all items are strings
                    if not all(isinstance(item, str) for item in recommendation_widgets):
                        return Response(
                            {'error': 'All recommendation widget items must be service names (strings)'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Validate services exist
                    from services.models import Service
                    for service_name in recommendation_widgets:
                        if not Service.objects.filter(name=service_name).exists():
                            return Response(
                                {'error': f'Service {service_name} not found'},
                                status=status.HTTP_404_NOT_FOUND
                            )
                    
                    config['recommendation_widgets'] = recommendation_widgets

                # Save config
                with open(config_path, 'w', encoding='utf-8') as f:
                    json.dump(config, f, indent=2, ensure_ascii=False)

                return Response({
                    'recommendation_widgets': config.get('recommendation_widgets', [])
                })

            return Response({'error': 'Unknown settings key'}, status=status.HTTP_404_NOT_FOUND)

        except FileNotFoundError:
            return Response(
                {'error': 'Configuration file not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
