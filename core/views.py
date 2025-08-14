from django.shortcuts import render
from .models import PetSpecies, EggPet, PomodoroProgress, Task
from .serializers import PetSpeciesSerializer, EggPetSerializer, PomodoroProgressSerializer, TaskSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status 
from rest_framework.decorators import api_view
from django.db.models.functions import Random

# GET all pet species
class PetSpeciesListView(APIView): 
  def get(self, request):
      species = PetSpecies.objects.all()
      serializer = PetSpeciesSerializer(species, many=True)
      return Response(serializer.data)

# GET & POST eggpets, with optional filtering
class EggPetListView(APIView): 
  def get(self, request): 
      is_active = request.GET.get('is_active')
      if is_active is not None:
          is_active = is_active.lower() == 'true'
          pets = EggPet.objects.filter(is_active=is_active)
      else:
          pets = EggPet.objects.all()

      serializer = EggPetSerializer(pets, many=True) 
      return Response(serializer.data) 
  
  def post(self, request):  
      serializer = EggPetSerializer(data=request.data) 
      if serializer.is_valid(): 
          serializer.save() 
          return Response(serializer.data, status=201)
      return Response(serializer.errors, status=400) 
  
class PomodoroProgressView(APIView):
    # GET Pomodoro progress
    # This endpoint retrieves the current Pomodoro progress for the user.
  def get(self, request):
      progress = PomodoroProgress.objects.first()  # just grabbing one for now
      if not progress:
          progress = PomodoroProgress.objects.create()
      serializer = PomodoroProgressSerializer(progress)
      return Response(serializer.data)
# PATCH to update Pomodoro progress
# This endpoint allows the user to add points and sessions to their Pomodoro progress.
  def patch(self, request):
      progress = PomodoroProgress.objects.first()
      if not progress:
          progress = PomodoroProgress.objects.create()

      new_points = request.data.get('add_points', 0)
      new_poms = request.data.get('add_sessions', 0)

      # Add to existing values
      progress.pomodoro_points += int(new_points)
      progress.pomodoros_completed += int(new_poms)
      progress.save()

      serializer = PomodoroProgressSerializer(progress)
      return Response(serializer.data, status=status.HTTP_200_OK) 
  
# PATCH to evolve a pet 
# This endpoint allows a pet to evolve based on the Pomodoro progress.  
# The evolution is based on a simple chain of stages defined in the view.
# # The pet can evolve if the user has enough Pomodoro points.
@api_view(['PATCH'])
def evolve_pet(request, pet_id):
    try:
        pet = EggPet.objects.get(id=pet_id)
        progress = PomodoroProgress.objects.first()
    except EggPet.DoesNotExist:
        return Response({'error': 'Pet not found'}, status=404)

    if not progress:
        return Response({'error': 'No Pomodoro progress record found'}, status=404)

    # Evolution rules
    evolution_chain = {
        'egg': ('cracked', 1),
        'cracked': ('hatched', 1),
        'hatched': ('evolved', 3),
    }

    current_stage = pet.stage
    if current_stage not in evolution_chain:
        return Response({'error': 'Pet cannot be evolved further'}, status=400)

    next_stage, cost = evolution_chain[current_stage]

    if progress.pomodoro_points < cost:
        return Response({'error': 'Not enough points'}, status=400)

    # Deduct points first
    progress.pomodoro_points -= cost
    progress.save()

    # Assign species ONLY when going cracked -> hatched and species is missing
    if current_stage == 'cracked' and next_stage == 'hatched' and pet.species is None:
        # Species already owned (global for now; later filter by user=pet.user)
        owned_species_ids = (
            EggPet.objects
            .exclude(species__isnull=True)
            .values_list('species_id', flat=True)
            .distinct()
        )

        # Option A: RANDOM UNIQUE
        available = PetSpecies.objects.exclude(id__in=owned_species_ids)
        if not available.exists():
            # All collected — allow repeats (or set a trophy flag here)
            available = PetSpecies.objects.all()

        pet.species = available.order_by(Random()).first()

    # Advance stage
    pet.stage = next_stage
    pet.save()

    serializer = EggPetSerializer(pet)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['PATCH'])
def activate_pet(request,pet_id): 
    try: 
        pet = EggPet.objects.get(id=pet_id) 
    except EggPet.DoesNotExist: 
        return Response({'error': 'Pet not found'}, status=status.HTTP_404_NOT_FOUND) 
    # If user accounts are implemented, make sure the pet belongs to the user 
    if pet.user and pet.user != request.user: 
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN) 
    # Deactivate all other pets for the user (if using auth) 
    EggPet.objects.filter(user=pet.user).update(is_active=False) 
    # Activate the selected pet
    pet.is_active = True
    pet.save()

    serializer = EggPetSerializer(pet)
    return Response(serializer.data, status=status.HTTP_200_OK) 

@api_view(['POST'])
def full_reset(request):
    # Optionally: Check user and only delete their pets
    EggPet.objects.all().delete()

    progress = PomodoroProgress.objects.first()
    if progress:
        progress.pomodoro_points = 0
        progress.pomodoros_completed = 0
        progress.save()

    return Response({'message': 'System reset successful.'}, status=status.HTTP_200_OK)

class TaskListCreateView(APIView):
    def get(self, request):
        tasks = Task.objects.all()
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400) 

@api_view(['PATCH'])
def toggle_task(request, task_id):
    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found'}, status=404)

    task.completed = not task.completed
    task.save()
    serializer = TaskSerializer(task)
    return Response(serializer.data)


@api_view(['PATCH'])
def reset_pet_to_egg(request, pet_id):
    try:
        pet = EggPet.objects.get(id=pet_id)
    except EggPet.DoesNotExist:
        return Response({'error': 'Pet not found'}, status=status.HTTP_404_NOT_FOUND)

    # Optional: if you add auth later, ensure pet.user == request.user

    pet.stage = EggPet.Stage.EGG      # back to egg
    pet.species = None                # species will be re-assigned at hatch
    pet.save()

    return Response(EggPetSerializer(pet).data, status=status.HTTP_200_OK) 

@api_view(['GET'])
def collection_summary(request):
    total_species = PetSpecies.objects.count()

    owned_species_ids = (
        EggPet.objects
        .exclude(species__isnull=True)
        .values_list('species_id', flat=True)
        .distinct()
    )

    # species that the player has at EVOLVED stage
    evolved_species_ids = set(
        EggPet.objects
        .filter(stage=EggPet.Stage.EVOLVED)
        .exclude(species__isnull=True)
        .values_list('species_id', flat=True)
        .distinct()
    )

    collected_qs = PetSpecies.objects.filter(id__in=owned_species_ids)
    collected_count = collected_qs.count()
    has_all = total_species > 0 and collected_count >= total_species

    collected_species = []
    for sp in collected_qs:
        is_evolved = sp.id in evolved_species_ids
        display = sp.evolved_image.url if (is_evolved and sp.evolved_image) else sp.image.url
        collected_species.append({
            "id": sp.id,
            "name": sp.name,
            "image": sp.image.url,  # base (keep for fallback/debug)
            "evolved_image": sp.evolved_image.url if sp.evolved_image else None,
            "is_evolved": is_evolved,
            "display_image": display,   # 👈 what the UI should show
        })

    return Response({
        "total_species": total_species,
        "collected_count": collected_count,
        "has_all": has_all,
        "collected_species": collected_species,
    })

@api_view(['PATCH'])
def rename_pet(request, pet_id):
    try:
        pet = EggPet.objects.get(id=pet_id)
    except EggPet.DoesNotExist:
        return Response({'error': 'Pet not found'}, status=status.HTTP_404_NOT_FOUND)

    new_name = (request.data.get('nickname') or '').strip()
    if not new_name:
        return Response({'error': 'Nickname is required'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new_name) > 100:
        return Response({'error': 'Nickname too long (max 100)'}, status=status.HTTP_400_BAD_REQUEST)

    pet.nickname = new_name
    pet.save()
    return Response(EggPetSerializer(pet).data, status=status.HTTP_200_OK)