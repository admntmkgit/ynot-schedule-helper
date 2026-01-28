"""
Utilities for file-based day persistence
Handles loading and saving DayData to/from JSON files
"""
import json
import os
from pathlib import Path
from datetime import datetime, date
from .models import DayData, DayMetadata


class DayPersistence:
    """Handles persistence of day data to/from JSON files"""
    
    def __init__(self, data_dir=None):
        """Initialize with data directory path"""
        if data_dir is None:
            # In Docker, backend is at /app, so data is at /app/data/days
            data_dir = Path('/app/data/days')
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def get_file_path(self, day_date):
        """Get the file path for a given date"""
        if isinstance(day_date, str):
            # Validate date format
            try:
                datetime.strptime(day_date, '%Y-%m-%d')
            except ValueError:
                raise ValueError(f"Invalid date format: {day_date}. Expected YYYY-MM-DD")
            date_str = day_date
        elif isinstance(day_date, date):
            date_str = day_date.strftime('%Y-%m-%d')
        else:
            raise ValueError(f"Invalid date type: {type(day_date)}")
        
        return self.data_dir / f"{date_str}.json"
    
    def exists(self, day_date):
        """Check if a day file exists"""
        file_path = self.get_file_path(day_date)
        return file_path.exists()
    
    def load(self, day_date):
        """Load DayData from JSON file"""
        file_path = self.get_file_path(day_date)
        
        if not file_path.exists():
            raise FileNotFoundError(f"Day file not found: {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return DayData.from_dict(data)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in day file {file_path}: {e}")
        except Exception as e:
            raise IOError(f"Error reading day file {file_path}: {e}")
    
    def save(self, day_data, update_metadata=True):
        """Save DayData to JSON file"""
        if not isinstance(day_data, DayData):
            raise ValueError("day_data must be a DayData instance")
        
        file_path = self.get_file_path(day_data.date)
        
        try:
            # Convert to dict and save as JSON
            data_dict = day_data.to_dict()
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data_dict, f, indent=2, ensure_ascii=False)
            
            # Update metadata in index.db if requested
            if update_metadata:
                self._update_metadata(day_data, file_path)
            
            return file_path
        except Exception as e:
            raise IOError(f"Error writing day file {file_path}: {e}")
    
    def delete(self, day_date, secure=False):
        """
        Delete a day file
        If secure=True, overwrite with random data before deleting
        """
        file_path = self.get_file_path(day_date)
        
        if not file_path.exists():
            return False
        
        try:
            if secure:
                # Secure delete: overwrite with random data first
                file_size = file_path.stat().st_size
                import random
                import string
                random_data = ''.join(random.choices(string.ascii_letters + string.digits, k=file_size))
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(random_data)
            
            # Delete the file
            file_path.unlink()
            
            # Update metadata
            try:
                metadata = DayMetadata.objects.get(date=day_date)
                metadata.status = 'deleted'
                metadata.save()
            except DayMetadata.DoesNotExist:
                pass
            
            return True
        except Exception as e:
            raise IOError(f"Error deleting day file {file_path}: {e}")
    
    def list_days(self):
        """List all day files in the data directory"""
        day_files = []
        for file_path in self.data_dir.glob('*.json'):
            try:
                # Extract date from filename
                date_str = file_path.stem
                datetime.strptime(date_str, '%Y-%m-%d')
                day_files.append(date_str)
            except ValueError:
                # Skip files that don't match YYYY-MM-DD.json pattern
                continue
        return sorted(day_files, reverse=True)
    
    def _update_metadata(self, day_data, file_path):
        """Update or create metadata entry in index.db"""
        try:
            metadata, created = DayMetadata.objects.update_or_create(
                date=day_data.date,
                defaults={
                    'status': day_data.status,
                    'closed_at': day_data.closed_at,
                    'file_path': str(file_path),
                }
            )
        except Exception as e:
            # Log error but don't fail the save operation
            print(f"Warning: Could not update metadata: {e}")


# Global instance
day_persistence = DayPersistence()
