from django.contrib.auth.models import AbstractUser
from django.contrib.auth.hashers import make_password, check_password
from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import CustomUserManager


class CustomUser(AbstractUser):
    """
    Legacy CustomUser model for Django admin access.
    Kept for compatibility with Django's admin authentication.
    """
    username = None
    email = models.EmailField(_("email address"), unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email


class AppUser(models.Model):
    """
    Phase 10: Simple PIN-based user model for the Nail Salon app.
    Users are identified by unique PINs without requiring usernames or emails.
    """
    name = models.CharField(max_length=100)
    pin_hash = models.CharField(max_length=256, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'App User'
        verbose_name_plural = 'App Users'

    def __str__(self):
        return self.name

    def set_pin(self, raw_pin: str):
        """
        Hash and store the PIN using Django's password hashing (pbkdf2_sha256).
        """
        self.pin_hash = make_password(raw_pin)

    def check_pin(self, raw_pin: str) -> bool:
        """
        Verify a raw PIN against the stored hash.
        """
        return check_password(raw_pin, self.pin_hash)

    @classmethod
    def authenticate_by_pin(cls, raw_pin: str):
        """
        Find and return the user matching the given PIN.
        Returns None if no match found.
        """
        for user in cls.objects.filter(is_active=True):
            if user.check_pin(raw_pin):
                return user
        return None