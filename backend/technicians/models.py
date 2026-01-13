from django.db import models


class Technician(models.Model):
    """Technician model stored in index.db"""
    alias = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'technicians'
        ordering = ['alias']

    def __str__(self):
        return f"{self.alias} - {self.name}" if self.name else self.alias

    @property
    def skills(self):
        """Get list of service names this tech can perform"""
        from services.models import TechSkill
        return list(TechSkill.objects.filter(tech_alias=self.alias).values_list('service_name', flat=True))

    def set_skills(self, service_names):
        """Set the skills for this technician"""
        from services.models import TechSkill, Service
        # Remove existing skills
        TechSkill.objects.filter(tech_alias=self.alias).delete()
        # Add new skills
        for service_name in service_names:
            if Service.objects.filter(name=service_name).exists():
                TechSkill.objects.create(tech_alias=self.alias, service_name=service_name)

    def has_skill(self, service_name):
        """Check if technician has a specific skill"""
        from services.models import TechSkill
        return TechSkill.objects.filter(tech_alias=self.alias, service_name=service_name).exists()
