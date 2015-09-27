#!/usr/bin/python
# -*- coding: UTF-8 -*-

from django.contrib import admin
from django.contrib.admin import ModelAdmin
from django.db.models import Count
from .models import Player, Team, TeamOnTournament, Tournament,\
    Match, Goal, Shot, GoalieInMatch, Penalty

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
def merge(modeladmin, request, queryset):
    main = queryset[0]
    tail = queryset[1:]

    related = main._meta.get_all_related_objects()
    valnames = dict()

    for r in related:
        valnames.setdefault(r.related_model, []).append(r.field.name)


    manyrelated = main._meta.get_all_related_many_to_many_objects()
    manyvalnames = dict()
    for r in manyrelated:
        manyvalnames.setdefault(r.related_model, []).append(r.field.name)


    for place in tail:
        for model, field_names in valnames.items():
            for field_name in field_names:
                model.objects.filter(**{field_name: place}).update(**{field_name: main})

        for model, field_names in manyvalnames.items():
            for field_name in field_names:
                for manytomany in  model.objects.filter(**{field_name: place}):
                    manyfield = getattr(manytomany, field_name)
                    manyfield.remove(place)
                    manyfield.add(main)

        place.delete()

    ModelAdmin.message_user(modeladmin, request, 'sloučeno, zvolte výsledné jméno')
merge.short_description = "Sloučit"


class PlayerInTeamsInline(admin.TabularInline):
    model = TeamOnTournament.players.through


class PlayerAdmin(admin.ModelAdmin):
    list_display = ('nickname', 'name', 'lastname', 'age', 'goal_count', 'assistance_count', 'gender')
    readonly_fields = ['age', 'goal_count', 'assistance_count']
    search_fields = ['nickname', 'name', 'lastname']
    inlines = [PlayerInTeamsInline]
    actions = [merge]

    #TOO SLOW
    '''
    def get_queryset(self, request):
        qs = super(ModelAdmin, self).get_queryset(request)
        qs = qs.annotate(number_of_goals=Count('goals', distinct=True))
        qs = qs.annotate(number_of_assistances=Count('assistances', distinct=True))
        return qs

    def number_of_goals(self, obj):
        return obj.number_of_goals
    number_of_goals.admin_order_field = 'number_of_goals'
    number_of_goals.short_description = 'Počet gólů'

    def number_of_assistances(self, obj):
        return obj.number_of_assistances
    number_of_assistances.admin_order_field = 'number_of_assistances'
    number_of_assistances.short_description = 'Počet asistencí'
    '''



class TeamAdmin(admin.ModelAdmin):
    search_fields = ['name']
    actions = [merge]


class TeamTournamentAdmin(admin.ModelAdmin):
    readonly_fields=('fake',) #carka vytvari tupple
    fieldsets = [
        (None, {'fields': ['team', 'captain', 'tournament', 'name', 'fake']})
    ]
    search_fields = ['name', 'team__name']
    inlines = [PlayerInTeamsInline]
    actions = ['mergeTeamTour']

    def mergeTeamTour(self, request, queryset):
        main = queryset[0]
        tail = queryset[1:]

        #related = main._meta.get_fields()
        for team in tail:
            for player in team.players.all():
                main.players.add(player)
            team.delete()

        self.message_user(request, 'sloučeno, zvolte výsledné jméno')
    mergeTeamTour.short_description = "Sloučit"


class MatchAdmin(admin.ModelAdmin):
    readonly_fields=('score_one','score_two') #carka vytvari tupple



admin.site.register(Player, PlayerAdmin)
admin.site.register(Team, TeamAdmin)
admin.site.register(TeamOnTournament, TeamTournamentAdmin)
admin.site.register(Tournament)
admin.site.register(Match, MatchAdmin)
admin.site.register(Goal)
admin.site.register(Shot)
admin.site.register(GoalieInMatch)
admin.site.register(Penalty)