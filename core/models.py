from django.db import models
from django.contrib.auth.models import User
#Models consist of the Task todo and the Egg Hatching Gimmick

# Create your models here.

#Simple Todo Task Section within the page
# Consists of a text bar and a checkbox(to check if completed)
class Task(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=255)
    completed = models.BooleanField(default=False)

class PetSpecies(models.Model):
    name = models.CharField(max_length=100)
    image = models.ImageField(upload_to='images/')
    evolved_image = models.ImageField(upload_to='images/', null=True, blank=True) 
    class Meta:
        verbose_name_plural = "Pet species"


class EggPet(models.Model): 
    class Stage(models.TextChoices): 
        EGG = "egg", "Egg"
        CRACKED = "cracked", "Cracked"
        HATCHED = "hatched", "Hatched"
        EVOLVED = "evolved", "Evolved"
        
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    species = models.ForeignKey(PetSpecies, on_delete=models.SET_NULL, null=True, blank=True)
    stage = models.CharField(max_length=20, choices = Stage.choices, default=Stage.EGG) 
    nickname = models.CharField(max_length=100) 
    is_active = models.BooleanField(default=False) 

class PomodoroProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    pomodoro_points = models.IntegerField(default=0)
    pomodoros_completed = models.IntegerField(default=0)

