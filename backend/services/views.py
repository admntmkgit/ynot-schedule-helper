from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Service, TechSkill
from .serializers import ServiceSerializer, ServiceTechsSerializer, TechSkillSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Service CRUD operations
    Provides: list, create, retrieve, update, partial_update, destroy
    """
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    lookup_field = 'name'

    def get_object(self):
        """Override to handle URL-encoded names"""
        from urllib.parse import unquote
        lookup_value = unquote(self.kwargs[self.lookup_field])
        return Service.objects.get(**{self.lookup_field: lookup_value})

    @action(detail=True, methods=['get', 'put'], url_path='techs')
    def techs(self, request, name=None):
        """
        GET: Get qualified techs for this service
        PUT: Update qualified techs for this service
        """
        try:
            service = self.get_object()
        except Service.DoesNotExist:
            return Response(
                {'error': 'Service not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if request.method == 'GET':
            return Response({'qualified_techs': service.qualified_techs})

        elif request.method == 'PUT':
            serializer = ServiceTechsSerializer(
                service,
                data=request.data,
                partial=False
            )
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'name': service.name,
                    'qualified_techs': service.qualified_techs
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Delete a service and associated tech skills"""
        try:
            instance = self.get_object()
            # Delete associated tech skills
            TechSkill.objects.filter(service_name=instance.name).delete()
            # Delete the service
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Service.DoesNotExist:
            return Response(
                {'error': 'Service not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='rename')
    def rename(self, request, name=None):
        """
        POST /api/services/{name}/rename/ with { "new_name": "New Service Name" }
        Renames a service (creates new record, moves tech skills, deletes old)
        """
        new_name = request.data.get('new_name')
        if not new_name:
            return Response({'error': 'new_name is required'}, status=status.HTTP_400_BAD_REQUEST)

        if new_name == name:
            return Response({'error': 'new_name is the same as current name'}, status=status.HTTP_400_BAD_REQUEST)

        if Service.objects.filter(name=new_name).exists():
            return Response({'error': f'Service {new_name} already exists'}, status=status.HTTP_409_CONFLICT)

        try:
            old = self.get_object()
        except Service.DoesNotExist:
            return Response({'error': 'Service not found'}, status=status.HTTP_404_NOT_FOUND)

        # Create new service
        new_time = request.data.get('time_needed', old.time_needed)
        new_is_bonus = request.data.get('is_bonus', old.is_bonus)
        new_service = Service.objects.create(name=new_name, time_needed=new_time, is_bonus=new_is_bonus)

        # Move TechSkill entries
        TechSkill.objects.filter(service_name=old.name).update(service_name=new_name)

        # Delete old service
        old.delete()

        return Response({'name': new_service.name, 'time_needed': new_service.time_needed, 'is_bonus': new_service.is_bonus})


class TechSkillViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing TechSkill relationships
    Read-only - skills are managed through Technician and Service endpoints
    """
    queryset = TechSkill.objects.all()
    serializer_class = TechSkillSerializer
