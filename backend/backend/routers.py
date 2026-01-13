"""
Database router to send technicians, services, and days models to index.db
"""


class IndexDBRouter:
    """
    A router to control database operations for models in the
    technicians, services, and days applications.
    """
    route_app_labels = {'technicians', 'services', 'days'}

    def db_for_read(self, model, **hints):
        """
        Attempts to read technicians, services, and days models go to index.
        """
        if model._meta.app_label in self.route_app_labels:
            return 'index'
        return None

    def db_for_write(self, model, **hints):
        """
        Attempts to write technicians, services, and days models go to index.
        """
        if model._meta.app_label in self.route_app_labels:
            return 'index'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if a model in the route_app_labels is involved.
        """
        if (
            obj1._meta.app_label in self.route_app_labels or
            obj2._meta.app_label in self.route_app_labels
        ):
            return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Make sure the route_app_labels only appear in the 'index' database.
        """
        if app_label in self.route_app_labels:
            return db == 'index'
        return None
