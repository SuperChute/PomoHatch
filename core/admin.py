from django.contrib import admin
from .models import Task, PetSpecies, EggPet

# Register your models here.
admin.site.register(Task)
admin.site.register(PetSpecies)

@admin.register(EggPet)
class EggPetAdmin(admin.ModelAdmin):
    list_display = ['nickname', 'stage', 'user', 'species', 'is_active']
    list_filter = ['stage', 'is_active']
    search_fields = ['nickname']

