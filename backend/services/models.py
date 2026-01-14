from django.db import models


class Service(models.Model):
    """Service model stored in index.db"""
    name = models.CharField(max_length=200, primary_key=True)
    time_needed = models.IntegerField(help_text="Time needed in minutes")
    short_name = models.CharField(max_length=50, blank=True, default='', help_text="Short display name for UI")
    is_bonus = models.BooleanField(default=False, help_text="Whether this service counts as a bonus turn")
    is_default = models.BooleanField(default=False, help_text="Auto-assign to all techs (can be manually overridden)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'services'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.time_needed} min)"

    @property
    def qualified_techs(self):
        """Get list of tech aliases who can perform this service"""
        return list(TechSkill.objects.filter(service_name=self.name).values_list('tech_alias', flat=True))

    def set_qualified_techs(self, tech_aliases):
        """Set the qualified techs for this service"""
        from technicians.models import Technician
        # Remove existing associations
        TechSkill.objects.filter(service_name=self.name).delete()
        # Add new associations
        for tech_alias in tech_aliases:
            if Technician.objects.filter(alias=tech_alias).exists():
                TechSkill.objects.create(tech_alias=tech_alias, service_name=self.name)


class TechSkill(models.Model):
    """Many-to-many relationship between technicians and services"""
    tech_alias = models.CharField(max_length=50, db_index=True)
    service_name = models.CharField(max_length=200, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tech_skills'
        unique_together = ['tech_alias', 'service_name']
        ordering = ['tech_alias', 'service_name']

    def __str__(self):
        return f"{self.tech_alias} - {self.service_name}"
