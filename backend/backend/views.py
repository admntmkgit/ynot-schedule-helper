from django.http import JsonResponse
from django.shortcuts import render
from rest_framework.decorators import api_view


def home(request):
    """Serve the main HTML page"""
    return render(request, 'home.html')


@api_view(['GET'])
def hello_world(request):
    """Simple API endpoint for testing"""
    return JsonResponse({
        'message': 'Hello World from Schedule Helper API!',
        'status': 'running',
        'version': '0.1.0'
    })
