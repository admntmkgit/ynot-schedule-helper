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

    def create(self, validated_data):
        """Create a new technician"""
        skills_data = self.initial_data.get('skills', [])
        alias = validated_data['alias']
        name = validated_data.get('name', '')
        
        technician = Technician.objects.create(alias=alias, name=name)
        if skills_data:
            technician.set_skills(skills_data)
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
