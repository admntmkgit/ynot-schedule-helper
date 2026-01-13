from rest_framework import serializers
from .models import DayMetadata, Seating, DayRow, DayData


class DayMetadataSerializer(serializers.ModelSerializer):
    """Serializer for DayMetadata model"""
    class Meta:
        model = DayMetadata
        fields = ['date', 'status', 'created_at', 'closed_at', 'file_path']
        read_only_fields = ['created_at']


class SeatingSerializer(serializers.Serializer):
    """Serializer for Seating data structure"""
    id = serializers.CharField(read_only=True)
    is_requested = serializers.BooleanField(default=False)
    is_bonus = serializers.BooleanField(default=False)
    service = serializers.CharField(required=True)
    short_name = serializers.CharField(required=False, allow_blank=True)
    time = serializers.CharField(read_only=True)
    value = serializers.IntegerField(default=0, min_value=0)
    has_value_penalty = serializers.BooleanField(default=False)

    def create(self, validated_data):
        """Create a Seating instance"""
        return Seating(**validated_data)

    def update(self, instance, validated_data):
        """Update a Seating instance"""
        for key, value in validated_data.items():
            setattr(instance, key, value)
        return instance


class DayRowSerializer(serializers.Serializer):
    """Serializer for DayRow data structure"""
    row_number = serializers.IntegerField(min_value=0)
    tech_alias = serializers.CharField(required=True)
    tech_name = serializers.CharField(required=False, allow_blank=True)
    seatings = SeatingSerializer(many=True, required=False)
    regular_turns = serializers.IntegerField(default=0, min_value=0)
    bonus_turns = serializers.IntegerField(default=0, min_value=0)
    is_on_break = serializers.BooleanField(default=False)
    is_active = serializers.BooleanField(default=True)

    def create(self, validated_data):
        """Create a DayRow instance"""
        seatings_data = validated_data.pop('seatings', [])
        row = DayRow(**validated_data)
        row.seatings = [Seating(**s) if isinstance(s, dict) else s for s in seatings_data]
        return row

    def update(self, instance, validated_data):
        """Update a DayRow instance"""
        seatings_data = validated_data.pop('seatings', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if seatings_data is not None:
            instance.seatings = [Seating(**s) if isinstance(s, dict) else s for s in seatings_data]
        return instance


class DayDataSerializer(serializers.Serializer):
    """Serializer for DayData data structure"""
    date = serializers.CharField(required=True)
    status = serializers.ChoiceField(
        choices=['open', 'ended', 'closed'],
        default='open'
    )
    day_rows = DayRowSerializer(many=True, required=False)
    new_day_checklist = serializers.ListField(required=False)
    end_day_checklist = serializers.ListField(required=False)
    created_at = serializers.CharField(read_only=True)
    closed_at = serializers.CharField(required=False, allow_null=True)

    def create(self, validated_data):
        """Create a DayData instance"""
        day_rows_data = validated_data.pop('day_rows', [])
        day = DayData(**validated_data)
        day.day_rows = []
        for row_data in day_rows_data:
            serializer = DayRowSerializer(data=row_data)
            if serializer.is_valid():
                day.day_rows.append(serializer.save())
        return day

    def update(self, instance, validated_data):
        """Update a DayData instance"""
        day_rows_data = validated_data.pop('day_rows', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if day_rows_data is not None:
            instance.day_rows = []
            for row_data in day_rows_data:
                serializer = DayRowSerializer(data=row_data)
                if serializer.is_valid():
                    instance.day_rows.append(serializer.save())
        return instance
