from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Technician
from .serializers import TechnicianSerializer, TechnicianSkillsSerializer


class TechnicianViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Technician CRUD operations
    Provides: list, create, retrieve, update, partial_update, destroy
    """
    queryset = Technician.objects.all()
    serializer_class = TechnicianSerializer
    lookup_field = 'alias'

    @action(detail=True, methods=['get', 'put'], url_path='skills')
    def skills(self, request, alias=None):
        """
        GET: Get technician skills
        PUT: Update technician skills
        """
        try:
            technician = self.get_object()
        except Technician.DoesNotExist:
            return Response(
                {'error': 'Technician not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if request.method == 'GET':
            return Response({'skills': technician.skills})

        elif request.method == 'PUT':
            serializer = TechnicianSkillsSerializer(
                technician,
                data=request.data,
                partial=False
            )
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'alias': technician.alias,
                    'skills': technician.skills
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Delete a technician and associated skills"""
        try:
            instance = self.get_object()
            # Delete associated skills
            from services.models import TechSkill
            TechSkill.objects.filter(tech_alias=instance.alias).delete()
            # Delete the technician
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Technician.DoesNotExist:
            return Response(
                {'error': 'Technician not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='rename')
    def rename(self, request, alias=None):
        """
        POST /api/techs/{alias}/rename/ with { "new_alias": "newAlias" }
        Renames a technician (creates new record, moves skills, deletes old)
        """
        new_alias = request.data.get('new_alias')
        if not new_alias:
            return Response({'error': 'new_alias is required'}, status=status.HTTP_400_BAD_REQUEST)

        if new_alias == alias:
            return Response({'error': 'new_alias is the same as current alias'}, status=status.HTTP_400_BAD_REQUEST)

        if Technician.objects.filter(alias=new_alias).exists():
            return Response({'error': f'Technician {new_alias} already exists'}, status=status.HTTP_409_CONFLICT)

        try:
            old = Technician.objects.get(alias=alias)
        except Technician.DoesNotExist:
            return Response({'error': 'Technician not found'}, status=status.HTTP_404_NOT_FOUND)

        # Create new technician
        new_name = request.data.get('name', old.name)
        new_tech = Technician.objects.create(alias=new_alias, name=new_name)

        # Move TechSkill entries
        from services.models import TechSkill
        TechSkill.objects.filter(tech_alias=old.alias).update(tech_alias=new_alias)

        # Delete old technician
        old.delete()

        return Response({'alias': new_tech.alias, 'name': new_tech.name})
