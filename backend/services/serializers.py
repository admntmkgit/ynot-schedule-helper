from rest_framework import serializers
from .models import Service, TechSkill


class ServiceSerializer(serializers.Serializer):
    """Serializer for Service model"""
    name = serializers.CharField(max_length=200, required=True)
    short_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    time_needed = serializers.IntegerField(required=True, min_value=1)
    is_bonus = serializers.BooleanField(required=False, default=False)
    qualified_techs = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        read_only=True
    )
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        """Create a new service"""
        qualified_techs_data = self.initial_data.get('qualified_techs', [])
        name = validated_data['name']
        time_needed = validated_data['time_needed']
        is_bonus = validated_data.get('is_bonus', False)
        
        service = Service.objects.create(
            name=name,
            time_needed=time_needed,
            is_bonus=is_bonus,
            short_name=validated_data.get('short_name', '')
        )
        if qualified_techs_data:
            service.set_qualified_techs(qualified_techs_data)
        return service

    def update(self, instance, validated_data):
        """Update an existing service"""
        instance.time_needed = validated_data.get('time_needed', instance.time_needed)
        instance.is_bonus = validated_data.get('is_bonus', instance.is_bonus)
        instance.short_name = validated_data.get('short_name', instance.short_name)
        instance.save()
        
        # Update qualified techs if provided
        qualified_techs_data = self.initial_data.get('qualified_techs')
        if qualified_techs_data is not None:
            instance.set_qualified_techs(qualified_techs_data)
        
        return instance

    def to_representation(self, instance):
        """Custom representation to include qualified_techs"""
        ret = super().to_representation(instance)
        ret['short_name'] = instance.short_name
        ret['qualified_techs'] = instance.qualified_techs
        return ret


class ServiceTechsSerializer(serializers.Serializer):
    """Serializer for updating service qualified techs"""
    qualified_techs = serializers.ListField(
        child=serializers.CharField(),
        required=True
    )

    def update(self, instance, validated_data):
        """Update service qualified techs"""
        instance.set_qualified_techs(validated_data['qualified_techs'])
        return instance


class TechSkillSerializer(serializers.ModelSerializer):
    """Serializer for TechSkill model"""
    class Meta:
        model = TechSkill
        fields = ['tech_alias', 'service_name', 'created_at']
        read_only_fields = ['created_at']
