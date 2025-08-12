from rest_framework import serializers 
from .models import PetSpecies, EggPet, PomodoroProgress, Task

class PetSpeciesSerializer(serializers.ModelSerializer):
    class Meta:
        model = PetSpecies
        fields = '__all__' 

class EggPetSerializer(serializers.ModelSerializer):
    # GET: Use this for nested species data
    species_data = PetSpeciesSerializer(source='species', read_only=True)

    # POST: Accept species ID
    species = serializers.PrimaryKeyRelatedField(
    queryset=PetSpecies.objects.all(),
    allow_null=True,
    required=False
)

    class Meta:
        model = EggPet
        fields = ['id', 'species', 'species_data', 'stage', 'nickname', 'is_active', 'user']

class PomodoroProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = PomodoroProgress
        fields = '__all__' 

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'

