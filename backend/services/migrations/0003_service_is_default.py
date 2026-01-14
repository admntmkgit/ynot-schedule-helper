# Generated migration for adding is_default field to Service model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0002_service_short_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='is_default',
            field=models.BooleanField(default=False, help_text='Auto-assign to all techs (can be manually overridden)'),
        ),
    ]
