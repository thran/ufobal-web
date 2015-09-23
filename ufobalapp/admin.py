#!/usr/bin/python
# -*- coding: UTF-8 -*-

from django.contrib import admin

#from .models import Question, Choice
from .models import Player, Team, TeamOnTournament, Tournament,\
    Match, Goal, GoalieInMatch, Penalty

#test
'''
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 1


class QuestionAdmin(admin.ModelAdmin):
    fieldsets = [
        (None,               {'fields': ['question_text']}),
        ('Date information', {'fields': ['pub_date'], 'classes': ['collapse']}),
    ]
    inlines = [ChoiceInline]
    list_display = ('question_text', 'pub_date', 'was_published_recently')
    list_filter = ['pub_date']
    search_fields = ['question_text']

admin.site.register(Question, QuestionAdmin)
'''

#ufobal
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('name', 'lastname', 'nickname', 'age')
    readonly_fields = ['age']
    search_fields = ['nickname', 'name', 'lastname']


class PlayerInline(admin.TabularInline):
    model = TeamOnTournament.players.through

class TeamTournamentAdmin(admin.ModelAdmin):
    readonly_fields=('name',) #carka vytvari tupple
    fieldsets = [
        (None, {'fields': ['team', 'captain', 'tournament', 'name']})
    ]
    inlines = [PlayerInline]


class MatchAdmin(admin.ModelAdmin):
    readonly_fields=('score_one','score_two') #carka vytvari tupple



admin.site.register(Player, PlayerAdmin)
admin.site.register(Team)
admin.site.register(TeamOnTournament, TeamTournamentAdmin)
admin.site.register(Tournament)
admin.site.register(Match, MatchAdmin)
admin.site.register(Goal)
admin.site.register(GoalieInMatch)
admin.site.register(Penalty)