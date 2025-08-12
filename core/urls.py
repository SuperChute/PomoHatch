from django.urls import path
from .views import PetSpeciesListView, EggPetListView, PomodoroProgressView, evolve_pet, activate_pet, full_reset, TaskListCreateView, toggle_task, reset_pet_to_egg, collection_summary, rename_pet

urlpatterns = [
    path('species/', PetSpeciesListView.as_view(), name='pet-species-list'), 
    path('eggpets/', EggPetListView.as_view()),  
    path('progress/', PomodoroProgressView.as_view()),  
    path('eggpets/<int:pet_id>/evolve/', evolve_pet, name='evolve-pet'), 
    path('eggpets/<int:pet_id>/activate/', activate_pet), 
    path('reset/', full_reset), 
    path('tasks/', TaskListCreateView.as_view()),
    path('tasks/<int:task_id>/toggle/', toggle_task),
    path('eggpets/<int:pet_id>/reset/', reset_pet_to_egg),
    path('collection/', collection_summary),
    path('eggpets/<int:pet_id>/rename/', rename_pet),
]