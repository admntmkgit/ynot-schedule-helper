"""
Phase 10: User Serializers
Serializers for PIN-based user management
"""
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import AppUser


class AppUserSerializer(serializers.ModelSerializer):
    """
    Serializer for AppUser model - used for listing and retrieving users.
    PIN is write-only for security.
    """
    pin = serializers.CharField(
        write_only=True, 
        required=True, 
        min_length=4,
        help_text="PIN must be at least 4 digits"
    )
    pin_confirm = serializers.CharField(
        write_only=True, 
        required=False,
        help_text="PIN confirmation for create/update operations"
    )

    class Meta:
        model = AppUser
        fields = ['id', 'name', 'pin', 'pin_confirm', 'created_at', 'updated_at', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_pin(self, value):
        """Validate PIN is numeric and at least 4 digits."""
        if not value.isdigit():
            raise serializers.ValidationError("PIN must contain only digits.")
        if len(value) < 4:
            raise serializers.ValidationError("PIN must be at least 4 digits.")
        return value

    def validate(self, attrs):
        """
        Validate that PIN is unique and confirmation matches.
        """
        pin = attrs.get('pin')
        pin_confirm = attrs.pop('pin_confirm', None)

        # For create operations, pin_confirm is required
        if not self.instance and pin_confirm is None:
            raise serializers.ValidationError({'pin_confirm': 'PIN confirmation is required.'})

        # Check PIN confirmation matches
        if pin_confirm is not None and pin != pin_confirm:
            raise serializers.ValidationError({'pin_confirm': 'PINs do not match.'})

        # Check PIN uniqueness by trying to authenticate with it
        if pin:
            existing_user = AppUser.authenticate_by_pin(pin)
            if existing_user:
                # If updating, allow the same PIN if it's the same user
                if self.instance and existing_user.id == self.instance.id:
                    pass
                else:
                    raise serializers.ValidationError({'pin': 'This PIN is already in use.'})

        return attrs

    def create(self, validated_data):
        """Create a new user with hashed PIN."""
        pin = validated_data.pop('pin')
        user = AppUser(**validated_data)
        user.set_pin(pin)
        user.save()
        return user

    def update(self, instance, validated_data):
        """Update user, re-hashing PIN if provided."""
        pin = validated_data.pop('pin', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if pin:
            instance.set_pin(pin)
        
        instance.save()
        return instance


class AppUserListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing users (no PIN fields).
    """
    class Meta:
        model = AppUser
        fields = ['id', 'name', 'is_active', 'created_at']
        read_only_fields = ['id', 'name', 'is_active', 'created_at']


class PINLoginSerializer(serializers.Serializer):
    """
    Serializer for PIN-only login.
    """
    pin = serializers.CharField(
        required=True,
        min_length=4,
        help_text="User's PIN"
    )

    def validate_pin(self, value):
        """Validate PIN format."""
        if not value.isdigit():
            raise serializers.ValidationError("PIN must contain only digits.")
        return value


class AppUserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user (PIN optional).
    """
    pin = serializers.CharField(
        write_only=True, 
        required=False, 
        min_length=4,
        allow_blank=True,
        help_text="New PIN (leave blank to keep current)"
    )
    pin_confirm = serializers.CharField(
        write_only=True, 
        required=False,
        allow_blank=True,
        help_text="PIN confirmation"
    )

    class Meta:
        model = AppUser
        fields = ['id', 'name', 'pin', 'pin_confirm', 'is_active']
        read_only_fields = ['id']

    def validate_pin(self, value):
        """Validate PIN if provided."""
        if value and not value.isdigit():
            raise serializers.ValidationError("PIN must contain only digits.")
        if value and len(value) < 4:
            raise serializers.ValidationError("PIN must be at least 4 digits.")
        return value

    def validate(self, attrs):
        """Validate PIN confirmation and uniqueness."""
        pin = attrs.get('pin', '')
        pin_confirm = attrs.pop('pin_confirm', '')

        # If PIN is being changed, require confirmation
        if pin:
            if pin != pin_confirm:
                raise serializers.ValidationError({'pin_confirm': 'PINs do not match.'})
            
            # Check PIN uniqueness
            existing_user = AppUser.authenticate_by_pin(pin)
            if existing_user and existing_user.id != self.instance.id:
                raise serializers.ValidationError({'pin': 'This PIN is already in use.'})

        return attrs

    def update(self, instance, validated_data):
        """Update user, optionally changing PIN."""
        pin = validated_data.pop('pin', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if pin:
            instance.set_pin(pin)
        
        instance.save()
        return instance
