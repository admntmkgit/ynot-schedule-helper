from rest_framework import serializers
from .models import Technician


class TechnicianSerializer(serializers.Serializer):
    """Serializer for Technician model"""
    alias = serializers.CharField(max_length=50, required=True)
    name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    skills = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        read_only=True
    )
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def validate_alias(self, value):
        """Validate that alias is unique on create"""
        # Only check uniqueness on create (not update)
        if not self.instance and Technician.objects.filter(alias=value).exists():
            raise serializers.ValidationError(f"Technician with alias '{value}' already exists")
        return value

    def create(self, validated_data):
        """Create a new technician"""
        from services.models import Service
        skills_data = self.initial_data.get('skills', [])
        alias = validated_data['alias']
        name = validated_data.get('name', '')
        
        technician = Technician.objects.create(alias=alias, name=name)
        
        # Auto-assign default services
        default_services = Service.objects.filter(is_default=True).values_list('name', flat=True)
        all_skills = list(set(list(skills_data) + list(default_services)))
        
        if all_skills:
            technician.set_skills(all_skills)
        return technician

    def update(self, instance, validated_data):
        """Update an existing technician"""
        instance.name = validated_data.get('name', instance.name)
        instance.save()
        
        # Update skills if provided
        skills_data = self.initial_data.get('skills')
        if skills_data is not None:
            instance.set_skills(skills_data)
        
        return instance

    def to_representation(self, instance):
        """Custom representation to include skills"""
        ret = super().to_representation(instance)
        ret['skills'] = instance.skills
        return ret


class TechnicianSkillsSerializer(serializers.Serializer):
    """Serializer for updating technician skills"""
    skills = serializers.ListField(
        child=serializers.CharField(),
        required=True
    )

    def update(self, instance, validated_data):
        """Update technician skills"""
        instance.set_skills(validated_data['skills'])
        return instance
