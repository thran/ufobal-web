import datetime
import math
import os

import qrcode
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.utils import timezone
from django.utils.crypto import get_random_string

from ufobal import settings


def generate_pair():
    # aby nemohli mit dva hraci stejnej token
    while True:
        token = get_random_string(length=5)

        try:
            player = Player.objects.get(pairing_token=token)
        except ObjectDoesNotExist:
            return token


class Player(models.Model):
    class Meta:
        verbose_name = "hráč"
        verbose_name_plural = "hráči"

    MAN = 'man'
    WOMAN = 'woman'
    GENDERS = (
        (MAN, 'muž'),
        (WOMAN, 'žena'),
    )

    name = models.CharField('Jméno', max_length=50, null=True, blank=True)
    lastname = models.CharField('Příjmení', max_length=50, null=True, blank=True)
    nickname = models.CharField('Přezdívka', max_length=50)
    birthdate = models.DateField('Datum narození', null=True, blank=True)
    gender = models.CharField(max_length=10, verbose_name='pohlaví', choices=GENDERS, null=True, blank=True)
    pairing_token = models.CharField('Párovací token', max_length=10, null=True, blank=True, default=generate_pair)
    user = models.OneToOneField(User, null=True, blank=True, on_delete=models.CASCADE)

    def to_json(self, tournaments=True, simple=False, staff=False, **kwargs):
        data = {
            "pk": self.pk,
            "name": self.name,
            "lastname": self.lastname,
            "nickname": self.nickname,
            "age": self.age(),
            "full_name": self.full_name(),
            "gender": self.gender,
            "is_paired": self.user is not None,
            "penalties": [p.to_json() for p in self.penalty_set.all()],
        }

        if staff:
            data["birthdate"] = self.birthdate

        if tournaments and not simple:
            data["tournaments"] = [t.to_json(players=False) for t in self.tournaments.all()]

        return data

    def age(self):
        if self.birthdate:
            on = datetime.date.today()
            when = self.birthdate
            was_earlier = (on.month, on.day) < (when.month, when.day)
            return on.year - when.year - was_earlier
        else:
            return None

    age.short_description = "Věk"

    def goal_count(self, match=None):
        if not match:
            return self.goals.count()
        else:
            return Goal.objects.filter(match=match, shooter=self).count()

    goal_count.short_description = 'Gólů celkem'

    def assistance_count(self, match=None):
        if not match:
            return self.assistances.count()
        else:
            return Goal.objects.filter(match=match, assistance=self).count()

    def point_sum(self):
        return self.assistances.count() + self.goals.count()

    assistance_count.short_description = 'Asistencí celkem'

    def full_name(self):
        name_parts = []
        if self.name:
            name_parts.append(self.name)
        if self.lastname:
            name_parts.append(self.lastname)

        if len(name_parts) == 0:
            return self.nickname
        return "{} - {}".format(self.nickname, " ".join(name_parts))

    def __str__(self):
        return "%s" % (self.nickname)

    def get_qr(self, request):
        dir_path = os.path.join(settings.MEDIA_ROOT, "QR_codes")
        path = os.path.join(dir_path, "{}.png".format(self.pairing_token))

        if not os.path.exists(dir_path):
            os.makedirs(dir_path)

        if not os.path.exists(path):
            img = qrcode.make(request.get_host() + "/sparovat_ucet/" + self.pairing_token)
            img.save(path)
        return settings.MEDIA_URL + "QR_codes/" + "{}.png".format(self.pairing_token)

    def get_pairing_link(self, request):
        return request.get_host() + "/sparovat_ucet/" + self.pairing_token


class Team(models.Model):
    class Meta:
        verbose_name = "tým"
        verbose_name_plural = "týmy"

    name = models.CharField('Jméno', max_length=100)
    name_short = models.CharField('Zkrácené jméno', max_length=20, null=True, blank=True)
    description = models.TextField('Popis', null=True, blank=True)

    def to_json(self, **kwargs):
        return {
            "pk": self.pk,
            "name": self.name,
            "name_short": self.name_short,
            "name_pure": str(self),
            "description": self.description,
        }

    def __str__(self):
        return self.name_short if self.name_short else self.name


class TeamOnTournamentManager(models.Manager):
    def get_queryset(self):
        return super(TeamOnTournamentManager, self).get_queryset().select_related('team', 'tournament')


class PairingRequest(models.Model):
    class Meta:
        verbose_name = "žádost o spárování"
        verbose_name_plural = "žádosti o spárování"

    APPROVED = 'approved'
    DENIED = 'denied'
    PENDING = 'pending'
    STATES = ((APPROVED, 'schváleno'), (DENIED, 'odmítnuto'), (PENDING, 'rozhoduje se'))

    state = models.CharField(max_length=15, verbose_name='stav', choices=STATES, default=PENDING)
    player = models.ForeignKey(Player, verbose_name='Hráč', related_name='pairing_request', on_delete=models.CASCADE)
    user = models.ForeignKey(User, verbose_name="Uživatel", related_name='pairing_request', on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    text = models.TextField(null=True, blank=True)


class TeamOnTournament(models.Model):
    class Meta:
        verbose_name = "tým na turnaji"
        verbose_name_plural = "týmy na turnaji"

    team = models.ForeignKey(Team, verbose_name='Tým', related_name='tournaments', on_delete=models.CASCADE)
    captain = models.ForeignKey(
        Player, verbose_name='Kapitán', related_name='captain', null=True, blank=True, on_delete=models.CASCADE
    )
    default_goalie = models.ForeignKey(
        Player,
        verbose_name='Nasazovaný brankář',
        related_name='default_goalie',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    name = models.CharField('Speciální jméno na turnaji?', max_length=100, null=True, blank=True)
    name_short = models.CharField('Zkrácené jméno na turnaji', max_length=20, null=True, blank=True)
    tournament = models.ForeignKey('Tournament', verbose_name='Turnaj', related_name='teams', on_delete=models.CASCADE)
    players = models.ManyToManyField(Player, verbose_name='Hráči', related_name='tournaments', blank=True)
    rank = models.IntegerField('Pořadí', null=True, blank=True)

    contact_mail = models.EmailField('Kontaktní email', null=True, blank=True)
    contact_phone = models.CharField('Kontaktní telefon', max_length=20, null=True, blank=True)
    strength = models.IntegerField('Odhad síly', null=True, blank=True)

    registration_time = models.DateTimeField('Čas registrace', auto_now_add=True, null=True, blank=True)

    objects = TeamOnTournamentManager()

    def to_json(self, players=True, simple=False, **kwargs):
        data = {
            "pk": self.pk,
            "team": self.team.to_json(),
            "captain": self.captain.pk if self.captain else None,
            "default_goalie": self.default_goalie.pk if self.default_goalie else None,
            "name": self.get_name(),
            "name_pure": self.name_pure,
            "name_short": self.name_short if self.name_short else self.team.name_short,
            "tournament": self.tournament.to_json(teams=False),
            "rank": self.rank,
        }

        if players:
            if simple:
                data["player_pks"] = [p.pk for p in self.players.all()]
            else:
                data["players"] = [p.to_json(tournaments=False) for p in self.players.all()]

        return data

    def __str__(self):
        if not self.name:
            return "{} - {} {}".format(self.team.name, self.tournament.name, self.tournament.date.year)
        else:
            return "{} ({}) - {} {}".format(self.name, self.team.name, self.tournament.name, self.tournament.date.year)

    def get_name(self):
        if self.name:
            return "{} ({})".format(self.name, self.team.name)
        else:
            return self.team.name

    @property
    def name_pure(self):
        if self.name_short:
            return self.name_short
        return self.name if self.name else str(self.team)

    @property
    def registration_time_with_seconds(self):
        if self.registration_time:
            return timezone.localtime(self.registration_time).strftime("%d. %m. %Y %H:%M:%S")
        return ''


class Tournament(models.Model):
    class Meta:
        verbose_name = "turnaj"
        verbose_name_plural = "turnaje"

    BRNO = 'brno'
    NIZKOV = 'nizkov'
    HALA = 'hala'
    OTHER = 'other'
    LIGA = 'liga'
    TRENING = 'trening'
    CATEGORIES = (
        (BRNO, 'Brno'),
        (NIZKOV, 'Nížkov'),
        (HALA, 'Hala'),
        (OTHER, 'Další'),
        (LIGA, 'Liga'),
        (TRENING, 'Trénink'),
    )

    category = models.CharField(max_length=15, verbose_name='kategorie', choices=CATEGORIES, null=True)
    date = models.DateField('Datum')
    registration_to = models.DateField('Přihlašování do', null=True, blank=True)
    name = models.CharField('Název', max_length=50)
    location = models.CharField('Lokace', max_length=50, null=True, blank=True)
    halftime_length = models.IntegerField('Délka poločasu', default=8)
    field_count = models.IntegerField('Počet hřišť', default=2)
    description = models.TextField("Popis", null=True, blank=True)
    closed_edit = models.BooleanField("Uzavřená editace", default=False)

    def to_json(self, teams=True, **kwargs):
        data = {
            "pk": self.pk,
            "category": self.get_category_display(),
            "category_slugname": self.category,
            "name": self.name,
            "location": self.location,
            "full_name": self.name + " " + str(self.date.year),
            "date": str(self.date) if self.date else None,
            "registration_to": str(self.registration_to),
            "registration_open": self.is_registration_open(),
            "is_tournament_open": self.is_tournament_open(),
            "is_after_tournament": self.date < datetime.date.today() or settings.TEST,
            "halftime_length": self.halftime_length,
            "field_count": self.field_count,
            "year": self.date.year,
            "description": self.description,
            "closed_edit": self.closed_edit,
        }

        if teams:
            data["teams"] = [t.to_json(players=False) for t in self.teams.all()]

        return data

    def is_registration_open(self):
        return self.registration_to is not None and self.registration_to >= datetime.date.today()

    def __str__(self):
        return "%s %s" % (self.name, self.date)

    def is_tournament_open(self):
        return not self.closed_edit and (
            self.date == datetime.date.today() or self.category in [self.LIGA, self.TRENING] or settings.TEST
        )


class Match(models.Model):
    class Meta:
        verbose_name = "zápas"
        verbose_name_plural = "zápasy"

    tournament = models.ForeignKey(Tournament, verbose_name='Turnaj', related_name="matches", on_delete=models.CASCADE)
    team_one = models.ForeignKey(
        TeamOnTournament, verbose_name='Tým 1', related_name='matches1', null=True, blank=True, on_delete=models.PROTECT
    )
    team_two = models.ForeignKey(
        TeamOnTournament, verbose_name='Tým 2', related_name='matches2', null=True, blank=True, on_delete=models.PROTECT
    )
    start = models.DateTimeField('Začátek zápasu', null=True, blank=True)
    end = models.DateTimeField('Konec zápasu', null=True, blank=True)
    halftime_length = models.TimeField('Délka poločasu', null=True, blank=True)
    length = models.TimeField('Délka zápasu', null=True, blank=True)
    goalies = models.ManyToManyField(Player, verbose_name='brankaři', through='GoalieInMatch')
    referee = models.ForeignKey(
        Player, related_name='refereed', verbose_name='rozhodčí', null=True, blank=True, on_delete=models.PROTECT
    )
    referee_team = models.ForeignKey(
        TeamOnTournament,
        related_name='refereed',
        verbose_name='rozhodčí tým',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    place = models.CharField(max_length=50, null=True, blank=True, verbose_name="Hřiště")
    # TODO hodnoceni od tymu....

    fake = models.BooleanField('Importovaný zápas', default=False)

    def to_json(self, events=True, extended=False, **kwargs):
        data = {
            "pk": self.pk,
            "tournament": self.tournament_id,
            "team_one": self.team_one_id,
            "team_two": self.team_two_id,
            "start": str(self.start) if self.start else None,
            "end": str(self.end) if self.end else None,
            "halftime_length": str(self.halftime_length) if self.halftime_length else None,
            "length": str(self.length) if self.length else None,
            "referee": self.referee_id,
            "referee_team": self.referee_team_id,
            "fake": self.fake,
            "place": self.place,
        }

        if events:
            data["goals"] = [goal.to_json() for goal in self.goals.all()]
            data["shots"] = [shot.to_json() for shot in self.shots.all()]
            data["penalties"] = [penalty.to_json() for penalty in self.penalties.all()]
            data["goalies"] = [goalie.to_json() for goalie in self.goalies_in_match.all()]
            data["with_shootout"] = self.with_shootout()
            data["score_one"] = self.score_one()
            data["score_two"] = self.score_two()

        if extended:
            data['team_one'] = self.team_one.to_json(simple=True)
            data['team_two'] = self.team_two.to_json(simple=True)
            data['referee_team'] = self.referee_team.to_json(simple=True)
            data['referee'] = (self.referee.to_json(simple=True) if self.referee else None,)

        return data

    def score_one(self):
        if self.team_one:
            players = [p.pk for p in self.team_one.players.all()]
            return sum([goal.shooter_id in players for goal in self.goals.all()])

    score_one.short_description = 'tým 1 scóre'

    def score_two(self):
        if self.team_two:
            players = [p.pk for p in self.team_two.players.all()]
            return sum([goal.shooter_id in players for goal in self.goals.all()])

    def with_shootout(self):
        return sum(1 for goal in self.goals.all() if goal.type == Goal.SHOOTOUT)

    score_two.short_description = 'tým 2 scóre'

    # TODO def result

    def __str__(self):
        if not self.team_one and not self.team_two:
            return "%s %s %s" % (self.tournament.name, self.tournament.date, 'fake')
        return "%s vs. %s, %s %s" % (
            self.team_one.get_name(),
            self.team_two.get_name(),
            self.tournament.name,
            self.tournament.date,
        )


class GoalieInMatch(models.Model):
    class Meta:
        verbose_name = "brankář"
        verbose_name_plural = "brankáři"

    goalie = models.ForeignKey(Player, verbose_name='brankář', on_delete=models.PROTECT)
    match = models.ForeignKey(Match, verbose_name='zápas', related_name="goalies_in_match", on_delete=models.CASCADE)
    start = models.TimeField('Začátek chytání')
    end = models.TimeField('Konec chytání', null=True, blank=True)

    def to_json(self):
        return {
            "pk": self.pk,
            "goalie": self.goalie_id,
            "match": self.match_id,
            "start": str(self.start),
            "end": str(self.end) if self.end else None,
        }


class Goal(models.Model):
    class Meta:
        verbose_name = "gól"
        verbose_name_plural = "góly"

    NORMAL = 'normal'
    PENALTY = 'penalty'
    SHOOTOUT = 'shootout'
    # TODO: z rohu? o zem?
    GOAL_TYPES = (
        (NORMAL, 'běžný'),
        (PENALTY, 'penalta'),
        (SHOOTOUT, 'penaltový rozstřel'),
    )

    shooter = models.ForeignKey(
        Player, related_name='goals', verbose_name='střelec', null=True, on_delete=models.PROTECT
    )
    assistance = models.ForeignKey(
        Player, related_name='assistances', verbose_name='asistent', null=True, blank=True, on_delete=models.PROTECT
    )
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='goals', on_delete=models.CASCADE)
    time = models.TimeField('Čas v zápase', null=True, blank=True)
    type = models.CharField(max_length=20, verbose_name='druh', choices=GOAL_TYPES, default=NORMAL)

    def to_json(self):
        data = {
            "pk": self.pk,
            "shooter": self.shooter_id,
            "assistance": self.assistance_id,
            "match": self.match_id,
            "time": str(self.time) if self.time is not None else None,
            "type": self.type,
        }
        return data

    def __str__(self):
        if self.match.fake:
            return "goal import"
        else:
            if (self.shooter and self.shooter in self.match.team_one.players.all()) or (
                self.assistance and self.assistance in self.match.team_one.players.all()
            ):
                teams = "{0} ---> {1}"

            elif (self.shooter and self.shooter in self.match.team_two.players.all()) or (
                self.assistance and self.assistance in self.match.team_two.players.all()
            ):
                teams = "{1} ---> {0}"

            else:
                teams = "{0} ??? {1}"

            return (teams + ": {2} ({3})").format(
                self.match.team_one.get_name(),
                self.match.team_two.get_name(),
                self.shooter.nickname if self.shooter else "-",
                self.assistance.nickname if self.assistance else "-",
            )


class Shot(models.Model):
    class Meta:
        verbose_name = "střela"
        verbose_name_plural = "střely"

    shooter = models.ForeignKey(
        Player, related_name='shots', verbose_name='střelec', blank=True, null=True, on_delete=models.PROTECT
    )
    team = models.ForeignKey(
        TeamOnTournament, related_name='shots', verbose_name='tým', null=True, on_delete=models.PROTECT
    )
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='shots', on_delete=models.CASCADE)
    time = models.TimeField('Čas v zápase')

    def to_json(self):
        return {
            "pk": self.pk,
            "time": str(self.time),
            "match": self.match_id,
            "shooter": self.shooter_id,
            "team": self.team_id,
        }


class Penalty(models.Model):
    class Meta:
        verbose_name = "trest"
        verbose_name_plural = "tresty"

    RED = 'red'
    YELLOW = 'yellow'
    CARDS = (
        (RED, 'červená'),
        (YELLOW, 'žlutá'),
    )

    card = models.CharField(max_length=10, verbose_name='karta', choices=CARDS)
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='penalties', on_delete=models.CASCADE)
    time = models.TimeField('čas')
    player = models.ForeignKey(Player, verbose_name='hráč', on_delete=models.PROTECT)
    reason = models.TextField('Důvod')

    def to_json(self):
        return {
            "pk": self.pk,
            "card": self.card,
            "card_verbose": self.get_card_display(),
            "time": str(self.time),
            "match": self.match.to_json(events=False),
            "tournament": self.match.tournament_id,
            "player": self.player_id,
            "reason": self.reason,
        }


class Log(models.Model):
    class Meta:
        verbose_name = "log"
        verbose_name_plural = "logy"

    user = models.ForeignKey(User, related_name='logs', verbose_name="uživatel", on_delete=models.PROTECT)
    url = models.TextField("url")
    data = models.TextField("data")
    timestamp = models.DateTimeField('timestamp', auto_now_add=True)


class Group(models.Model):
    class Meta:
        verbose_name = 'Skupina'
        verbose_name_plural = 'Skupiny'

    tournament = models.ForeignKey(Tournament, related_name='groups', verbose_name='turnaje', on_delete=models.PROTECT)
    name = models.CharField(max_length=50)
    teams = models.ManyToManyField(TeamOnTournament, related_name='groups', verbose_name='týmy')
    level = models.IntegerField(default=1)

    def to_json(self):
        return {
            "pk": self.pk,
            "tournament": self.tournament.to_json(teams=False),
            "teams": [
                team.to_json(players=False)
                for team in self.teams.order_by('team__name').select_related('captain', 'default_goalie')
            ],
            "level": self.level,
            "name": self.name,
        }

    def is_playoff(self, teams, matches):
        return len(teams) * math.log2(len(teams)) / 2 == len(matches) and len(teams) == 8

    def infer_playoff(self, teams, matches):
        matches = sorted(matches, key=lambda m: m.start if m.start else m.end)
        rounds = []
        team_count = len(teams)

        for team in teams:
            team.signature = []
            team.matches = []
            for match in matches:
                assert match.score_one() != match.score_two()
                if team == match.team_one:
                    team.signature.append(1 if match.score_one() > match.score_two() else 0)
                    team.matches.append(match)
                elif team == match.team_two:
                    team.signature.append(1 if match.score_one() < match.score_two() else 0)
                    team.matches.append(match)

        teams = sorted(teams, key=lambda t: t.signature, reverse=True)
        team_map = {team.pk: team for team in teams}
        round = teams[:1]
        for i in range(int(math.log2(team_count))):
            for j, team in enumerate(list(round)):
                match = team.matches[-i - 1]
                other_team = (
                    team_map[match.team_one.pk] if match.team_one.pk != team.pk else team_map[match.team_two.pk]
                )
                round.insert(2 * j + 1, other_team)
        rounds.append(round)

        for i in range(int(math.log2(team_count))):
            round = [None] * team_count

            looser_offset = 2 ** (int(math.log2(team_count)) - i - 1)
            for j in range(team_count // 2):
                team1, team2 = rounds[i][2 * j], rounds[i][2 * j + 1]
                assert team1.signature[i] == 1 - team2.signature[i]
                winner, looser = (team1, team2) if team1.signature[i] == 1 else (team2, team1)
                offset = j // looser_offset * looser_offset
                round[j + offset] = winner
                round[j + offset + looser_offset] = looser

            assert None not in round
            rounds.append(round)

        results = []
        for i, round in enumerate(rounds[:-1]):
            result = []
            for team in round:
                r = team.to_json(players=False)
                match = team.matches[i]
                r['score'] = match.score_one() if match.team_one.pk == team.pk else match.score_two()
                r['win'] = bool(team.signature[i])
                result.append(r)
            results.append(result)

        return results


class RefereeFeedback(models.Model):

    match = models.ForeignKey(Match, on_delete=models.CASCADE)
    author_team = models.ForeignKey(TeamOnTournament, on_delete=models.PROTECT)
    author = models.ForeignKey(Player, on_delete=models.PROTECT)

    feedback = models.JSONField(default=dict)

    updated = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return 'Feedback on {} from {}'.format(self.match, self.author_team)

    def to_json(self):
        return {
            'pk': self.pk,
            'match': self.match_id,
            'author_team': self.author_team_id,
            'author': self.author_id,
            'feedback': self.feedback,
        }
