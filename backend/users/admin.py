from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, AppUser


class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('email', 'is_staff', 'is_active',)
    list_filter = ('email', 'is_staff', 'is_active',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Permissions', {'fields': ('is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )
    search_fields = ('email',)
    ordering = ('email',)


@admin.register(AppUser)
class AppUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('name',)
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at', 'pin_hash')
    fieldsets = (
        (None, {'fields': ('name', 'is_active')}),
        ('Security', {'fields': ('pin_hash',), 'classes': ('collapse',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


admin.site.register(CustomUser, CustomUserAdmin)
