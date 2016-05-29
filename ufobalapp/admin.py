#!/usr/bin/python
# -*- coding: UTF-8 -*-

from django.contrib import admin
from django.contrib.admin import ModelAdmin
from django.db import models
from django.forms import SelectMultiple

from .models import Player, Team, TeamOnTournament, Tournament, \
    Match, Goal, Shot, GoalieInMatch, Penalty, Log, PairingRequest, Group
from django.contrib.auth.admin import UserAdmin


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
                for manytomany in model.objects.filter(**{field_name: place}):
                    manyfield = getattr(manytomany, field_name)  # gets attribute from string
                    manyfield.remove(place)
                    manyfield.add(main)

        place.delete()

    # merge all TeamsOnTournament on same Tournament for this Team
    modelname = modeladmin.__class__.__name__
    if modelname is 'TeamAdmin':
        tours = []
        team = Team.objects.get(name=main)
        totm = TeamOnTournament.objects.filter(team=team)
        for tour in totm:
            if tour.tournament not in tours:
                tours.append(tour.tournament)
        for tour in tours:
            totm = TeamOnTournament.objects.filter(team=team).filter(tournament=tour)
            if len(totm) > 1:
                for instance in totm[1:]:
                    for player in instance.players.all():
                        totm[0].players.add(player)
                    instance.delete()

    ModelAdmin.message_user(modeladmin, request, 'sloučeno, v objektu můžete zvolit výsledné jméno')


merge.short_description = "Sloučit"


class PlayerInTeamsInline(admin.TabularInline):
    model = TeamOnTournament.players.through


class PlayerAdmin(admin.ModelAdmin):
    list_display = ('nickname', 'name', 'lastname', 'age', 'goal_count', 'assistance_count', 'gender')
    readonly_fields = ['age', 'goal_count', 'assistance_count']
    search_fields = ['nickname', 'name', 'lastname']
    inlines = [PlayerInTeamsInline]
    actions = [merge]

    # TOO SLOW
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


class TeamOnTournamentInline(admin.TabularInline):
    model = TeamOnTournament


class TeamAdmin(admin.ModelAdmin):
    search_fields = ['name']
    actions = [merge]
    inlines = [TeamOnTournamentInline]


class TeamTournamentAdmin(admin.ModelAdmin):
    list_display = ('team', 'name', 'tournament_name', 'tournament_date', 'rank')
    fields = ['team', 'captain', 'tournament', 'name', 'rank', ('contact_mail', 'contact_phone'), 'strength']

    search_fields = ['name', 'team__name', 'tournament__name', 'tournament__date']
    inlines = [PlayerInTeamsInline]
    actions = ['mergeTeamTour']

    def mergeTeamTour(self, request, queryset):
        main = queryset[0]
        tail = queryset[1:]

        # related = main._meta.get_fields()
        for team in tail:
            for player in team.players.all():
                main.players.add(player)
            team.delete()

        self.message_user(request, 'sloučeno, v objektu můžete zvolit výsledné jméno')

    mergeTeamTour.short_description = "Sloučit"

    def tournament_name(self, obj):
        return obj.tournament.name

    tournament_name.short_description = "Turnaj"
    tournament_name.admin_order_field = 'tournament__name'

    def tournament_date(self, obj):
        return obj.tournament.date

    tournament_date.short_description = "Datum"
    tournament_date.admin_order_field = 'tournament__date'


class MatchAdmin(admin.ModelAdmin):
    list_display = ['tournament', 'place', 'referee_team', 'team_one', 'score_one', 'team_two', 'score_two', 'fake']
    readonly_fields = ('score_one', 'score_two')

    def get_queryset(self, request):
        my_model = super(MatchAdmin, self).get_queryset(request)
        my_model = my_model.prefetch_related('tournament', 'team_one', 'team_two', 'goals', 'team_one__players', 'team_two__players')
        return my_model


class TournamentAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'registration_to', 'halftime_length', 'field_count']
    search_fields = ['name', 'date']
    inlines = [TeamOnTournamentInline]


class GoalAdmin(admin.ModelAdmin):
    list_display = ('shooter', 'assistance', 'match', 'type')
    search_fields = ['shooter__name', 'shooter__nickname', 'assistance__name', 'assistance__nickname']


class GoalieInMatchAdmin(admin.ModelAdmin):
    list_display = ('match', 'goalie', 'start', 'end')


class PairingRequestAdmin(admin.ModelAdmin):
    list_display = ('player', 'user', 'state', 'timestamp')
    search_fields = ['player__nickname', 'user__username']
    readonly_fields = ('timestamp',)


class LogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'url', 'data')
    search_fields = ['user__username', 'url', 'data']
    readonly_fields = ('timestamp',)


class GroupAdmin(admin.ModelAdmin):
    list_display = ('pk', 'tournament', 'name', 'level')
    search_fields = ['tournament']

    formfield_overrides = {models.ManyToManyField: {'widget': SelectMultiple(attrs={'size': '15'})}, }

    def formfield_for_foreignkey(self, db_field, request=None, **kwargs):
        if db_field.name == 'tournament':
            kwargs["queryset"] = Tournament.objects.all().order_by('-date')
        return super(GroupAdmin, self).formfield_for_foreignkey(db_field, request, **kwargs)

    def formfield_for_manytomany(self, db_field, request=None, **kwargs):
        if db_field.name == "teams":
            kwargs["queryset"] = TeamOnTournament.objects.all().order_by('-tournament__date', 'team__name')
        return super(GroupAdmin, self).formfield_for_manytomany(db_field, request, **kwargs)


admin.site.register(Player, PlayerAdmin)
admin.site.register(Team, TeamAdmin)
admin.site.register(TeamOnTournament, TeamTournamentAdmin)
admin.site.register(Tournament, TournamentAdmin)
admin.site.register(Match, MatchAdmin)
admin.site.register(Goal, GoalAdmin)
admin.site.register(Shot)
admin.site.register(GoalieInMatch, GoalieInMatchAdmin)
admin.site.register(Penalty)
admin.site.register(Log, LogAdmin)
admin.site.register(PairingRequest, PairingRequestAdmin)
admin.site.register(Group, GroupAdmin)

UserAdmin.list_display += ('player', )
# jak pridat vyber hrace do Usera stejne jako v Player de vybirat User
