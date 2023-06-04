angular.module('ufoIS').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('auth.html',
    "<li><a href=\"/faq\">Co a jak?</a></li>\n" +
    "<li ng-show=\"user.is_staff\"><a href=\"/managestats/\" target=\"_self\">Admin</a></li>\n" +
    "\n" +
    "<li class=\"has-dropdown not-click\">\n" +
    "    <a href=\"#\" ng-show=\"userService.status.logged\">{{ user.first_name }} {{ user.last_name }} <span ng-show=\"user.player\">- {{ user.player.nickname }}</span></a>\n" +
    "    <a href=\"#\" ng-hide=\"userService.status.logged\"> Přihlášení </a>\n" +
    "\n" +
    "    <ul class=\"dropdown\">\n" +
    "        <li ng-show=\"userService.status.logged\"><a href=\"#\" ng-click=\"openProfile()\">Profil hráče</a></li>\n" +
    "        <li ng-show=\"userService.status.logged\"><a ng-click=\"userService.logout()\">Odhlásit se</a></li>\n" +
    "        <li ng-hide=\"userService.status.logged\">\n" +
    "            <a class=\"login-provider\" id=\"login-google\" ng-click=\"userService.loginGoogle()\">\n" +
    "                <img width=\"24\" height=\"24\" class=\"provider-signup-img\" src=\"static/google-icon.png\">\n" +
    "                <span class=\"provider-signup-text\">přes <b>Google</b></span>\n" +
    "            </a>\n" +
    "        </li>\n" +
    "        <li ng-hide=\"userService.status.logged\">\n" +
    "            <a class=\"login-provider\" id=\"login-facebook\" ng-click=\"userService.loginFacebook()\">\n" +
    "                <img width=\"24\" height=\"24\" class=\"provider-signup-img\" src=\"static/facebook-icon.png\">\n" +
    "                <span class=\"provider-signup-text\">přes <b>Facebook</b>&nbsp;&nbsp;&nbsp;&nbsp;</span>\n" +
    "            </a>\n" +
    "        </li>\n" +
    "        <li ng-hide=\"userService.status.logged\">\n" +
    "            <a class=\"login-provider\" href=\"#\" id=\"login-email\" data-reveal-id=\"login-modal\">\n" +
    "                <i class=\"fi-at-sign\"></i>\n" +
    "                <span class=\"provider-signup-text\">přes <b>jméno</b></span>\n" +
    "            </a>\n" +
    "        </li>\n" +
    "        <li ng-hide=\"userService.status.logged\">\n" +
    "            <a class=\"login-provider\" href=\"#\" id=\"login-email\" data-reveal-id=\"sign-up-modal\">\n" +
    "                <i class=\"fi-arrow-up\"></i>\n" +
    "                <span class=\"provider-signup-text\">registrovat</span>\n" +
    "            </a>\n" +
    "        </li>\n" +
    "    </ul>\n" +
    "</li>\n" +
    "\n" +
    "<div id=\"login-modal\" class=\"reveal-modal small\" data-reveal>\n" +
    "    <a class=\"close-reveal-modal\">&#215;</a><br/>\n" +
    "    <form ng-submit=\"login()\">\n" +
    "        <div class=\"row collapse\">\n" +
    "            <div class=\"columns medium-12 large-5\">\n" +
    "                <input ng-model=\"credentials.username\" type=\"text\" placeholder=\"jméno\" name=\"username\" />\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-8 large-5\">\n" +
    "                <input ng-model=\"credentials.password\" class=\"columns medium-5\" type=\"password\" placeholder=\"heslo\" name=\"password\" />\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-4 large-2\">\n" +
    "                <input type=\"submit\" class=\"button postfix\" value=\"Přihlásit\">\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </form>\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"sign-up-modal\" class=\"reveal-modal small\" data-reveal>\n" +
    "    <a class=\"close-reveal-modal\">&#215;</a><br/>\n" +
    "    <form ng-submit=\"signup()\">\n" +
    "        <label> Uživatelské jméno\n" +
    "            <input ng-model=\"credentials.username\" required type=\"text\" name=\"username\" />\n" +
    "        </label>\n" +
    "        <label> Email\n" +
    "            <input ng-model=\"credentials.email\" required type=\"email\" name=\"username\" />\n" +
    "        </label>\n" +
    "        <label> Heslo\n" +
    "            <input ng-model=\"credentials.password\" required type=\"password\" name=\"username\" />\n" +
    "        </label>\n" +
    "        <label> Kontrola hesla\n" +
    "            <input ng-model=\"credentials.password_check\" required type=\"password\"  name=\"username\" />\n" +
    "        </label>\n" +
    "        <label> Jméno\n" +
    "            <input ng-model=\"credentials.first_name\" type=\"text\" placeholder=\"nepovinné\" name=\"username\" />\n" +
    "        </label>\n" +
    "        <label> Příjmení\n" +
    "            <input ng-model=\"credentials.last_name\" type=\"text\" placeholder=\"nepovinné\" name=\"username\" />\n" +
    "        </label>\n" +
    "\n" +
    "        <div class=\"medium-5 columns\">\n" +
    "            <input type=\"submit\" class=\"button postfix\" value=\"Registrovat\">\n" +
    "        </div>\n" +
    "    </form>\n" +
    "</div>\n"
  );


  $templateCache.put('faq.html',
    "<h3>Co a jak?</h3>\n" +
    "\n" +
    "<h5>Co tento web vlastně je</h5>\n" +
    "<p>\n" +
    "    Jde o informační systém ufobalu (talířové taky). Naším cílem je shromáždit historické údaje do jedno systému,\n" +
    "    kde k nim bude snadný a rychlý přístup. Do budoucna (když se najde dobré technické řešení) chceme,\n" +
    "    aby se zápisy na turnaji dělali přímo do systému. Což nám umožní mít podrobnější, přesnější a rychlejší statistiky z turnajů.\n" +
    "</p>\n" +
    "\n" +
    "<h5>Co od vás potřebujeme</h5>\n" +
    "<p>\n" +
    "    Rádi bychom udělali historická data co nejvíce kompletní.\n" +
    "    Z tabulek výsledků se bohužel nedá vyčíst všechno a obsahují spoustu chyb a nejasností.\n" +
    "    Udělali jsme co šlo, abychom správně spojili výsledky z Nížkova, Brna a halových turnajů,\n" +
    "    ale nevíme všechno a neznáme všechny, takže bychom vás rádi poprosili o následující:\n" +
    "</p>\n" +
    "<ul>\n" +
    "    <li><b>Šiřte tento web</b> mezi další hráče ufobalu, aby nám taky pomohli. Použijte prosím odkaz <b><a target=\"_blank\" href=\"http://is.ufobal.cz/intro\">is.ufobal.cz/intro</a></b>.</li>\n" +
    "    <li>Najděte sebe a <b>doplňte osobní údaje</b> o sobě - hlavně jméno a pohlaví.</li>\n" +
    "    <li><b>Vyplňte za jaké týmy jste hráli</b> - víme, kde jste dali góly, ale bohužel ne vždy za jaký tým.</li>\n" +
    "    <li>\n" +
    "        <b>Zkontrolujte sebe a svůj tým</b> (týmy). Zejména očekáváme tyto problémy\n" +
    "        <ul>\n" +
    "            <li>Hráč je mezi hráči vícekrát.</li>\n" +
    "            <li>To stejné s týmy.</li>\n" +
    "            <li>Hráči chybějí nějaké góly.</li>\n" +
    "            <li>Špatné pořadí na turnaji. (Chybějící pořadí nehlašte, leda že byste znali celkové výsledky turnaje.)</li>\n" +
    "        </ul>\n" +
    "    </li>\n" +
    "    <li><b>Nahlašte nalezené problémy <a href=\"https://docs.google.com/forms/d/1AcEV9XoB__lzwH9sN71xINuW0r6bsnyIMRUMyLJByHM/viewform\" target=\"_blank\">sem</a></b>.</li>\n" +
    "    <li>Pro<b>hledejte</b> svoje disky a emaily (nevěřili byste, co se tam dá najít) jestli nemáte nějaké <b>historické tabulky s výsledky</b> (hlavně ty turnaje, které nemají pořadí týmů) a pošlete <a href=\"mailto:thran@centrum.cz\">nám</a> je.</li>\n" +
    "</ul>\n" +
    "\n" +
    "<p ng-show=\"intro\">\n" +
    "    Tyto a <b>další informace</b> budou vždy dostupné pod odkazem <i>Co a jak?</i> v horní liště napravo.\n" +
    "    <br>\n" +
    "    <b>Děkujme</b> všem, co se aktivně zapojí.\n" +
    "</p>\n" +
    "\n" +
    "<div ng-hide=\"intro\">\n" +
    "\n" +
    "    <h3>Často kladené dotazy</h3>\n" +
    "\n" +
    "    <h5>Můžu něco pokazit?</h5>\n" +
    "    <p>\n" +
    "        Krom znehodnocení dat o hráčích asi ne. Ale prosím, nezkoušejte to.\n" +
    "    </p>\n" +
    "\n" +
    "    <h5>Musím si vyplňovat jméno, příjmení a datum narození?</h5>\n" +
    "    <p>\n" +
    "        Rozhodně ne, ale budeme rádi. Díky jménu bude jasné o koho se přesně jedná.\n" +
    "        Datum budeme vždy zobrazovat jen jako věk a do budoucna bude použito pro nějaké statistiky.\n" +
    "        Slibujeme, že ho nikomu neřekneme.\n" +
    "    </p>\n" +
    "\n" +
    "    <h5>Nemůžu najít svůj tým na nějakém turnaji.</h5>\n" +
    "    <p>\n" +
    "        Bohužel u všech turnajů nevíme přesně, které týmy tam hráli.\n" +
    "        Pokud máte seznam týmů (nejlépe s pořadím) na nějakém turnaji, pošlete <a href=\"mailto:thran@centrum.cz\">nám</a> ho.\n" +
    "    </p>\n" +
    "\n" +
    "    <h5>Proč někteří hráči mají ve jméně jména týmů?</h5>\n" +
    "    <p>\n" +
    "        Ve výsledcích jsou často hráči stejného jména a někdy není jasné jaký hráč z Nížkova patří ke kterému z Brna.\n" +
    "        Aby bylo jasné o koho jde, pro jistotu jsme připojili jméno týmů, ve kterém hráč hrál.\n" +
    "        Pokud je hráč nějak identifikovatelný (doplněné jméno nebo účasti na turnajích), týmy se ze jména může smazat.\n" +
    "    </p>\n" +
    "\n" +
    "    <h5>Můžu vyplnit údaje za někoho jiného?</h5>\n" +
    "    <p>Ano, ale vyplňujte jen to čím jste si jisti.</p>\n" +
    "\n" +
    "</div>"
  );


  $templateCache.put('groups.html',
    "<a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "<hr>\n" +
    "\n" +
    "<h1>Skupiny - {{ tournament.full_name }}</h1>\n" +
    "\n" +
    "<div class=\"loader\" ng-hide=\"groups\"></div>\n" +
    "\n" +
    "<div ng-repeat=\"group in groups\">\n" +
    "    <h3 id=\"{{ group.name }}\">{{ group.name }}</h3>\n" +
    "    <table class=\"group\" ng-if=\"!group.playoff\">\n" +
    "        <tr class=\"first-line\">\n" +
    "            <th></th>\n" +
    "            <th ng-repeat=\"team in group.teams\"><a href=\"/tym/{{ team.team.pk }}/{{ team.team.name }}\">{{ team.name_pure }}</a></th>\n" +
    "            <td>V / P / R</td>\n" +
    "            <td>Skóre</td>\n" +
    "        </tr>\n" +
    "        <tr ng-repeat=\"team in group.teams\" ng-init=\"stats = stats[team.pk][group.level]\">\n" +
    "            <th>{{ team.name_pure }}</th>\n" +
    "            <td ng-repeat=\"team2 in group.teams\" ng-init='score = matches[team.pk+\"-\"+team2.pk][group.level]'>\n" +
    "                <span ng-show=\"score\">{{ score[0] }} : {{ score[1] }}<span ng-show=\"score[2]\">P</span></span>\n" +
    "            </td>\n" +
    "            <td><span>\n" +
    "                {{ stats['wins'] }}<span ng-show=\"stats['winsP']\">({{ stats['winsP'] }}P)</span> /\n" +
    "                {{ stats['looses'] }}<span ng-show=\"stats['loosesP']\">({{ stats['loosesP'] }}P)</span> /\n" +
    "                {{ stats['draws'] }}</span></td>\n" +
    "            <td><span ng-show=\"stats['score']\">{{ stats['score'][0] }} : {{ stats['score'][1] }}</span></td>\n" +
    "        </tr>\n" +
    "    </table>\n" +
    "\n" +
    "    <table class=\"playoff\" ng-if=\"group.playoff\">\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[0][0].win }\">{{ group.playoff[0][0].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[0][0].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[0][1].win }\">{{ group.playoff[0][1].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[0][1].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[1][0].win }\">{{ group.playoff[1][0].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[1][0].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[1][1].win }\">{{ group.playoff[1][1].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[1][1].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[0][2].win }\">{{ group.playoff[0][2].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[0][2].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black; border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[0][3].win }\">{{ group.playoff[0][3].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[0][3].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td class=\"gray\">Finále</td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[2][0].win }\">{{ group.playoff[2][0].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[2][0].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[2][1].win }\">{{ group.playoff[2][1].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[2][1].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[0][4].win }\">{{ group.playoff[0][4].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[0][4].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[0][5].win }\">{{ group.playoff[0][5].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[0][5].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2  ng-class=\"{bold: group.playoff[1][2].win }\">{{ group.playoff[1][2].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[1][2].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td class=\"gray\">O 3. místo</td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black; border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[2][2].win }\">{{ group.playoff[2][2].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[2][2].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[1][3].win }\">{{ group.playoff[1][3].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[1][3].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[0][6].win }\">{{ group.playoff[0][6].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[0][6].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[2][3].win }\">{{ group.playoff[2][3].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[2][3].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black; border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[0][7].win }\">{{ group.playoff[0][7].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[0][7].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[1][4].win }\">{{ group.playoff[1][4].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[1][4].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[1][5].win }\">{{ group.playoff[1][5].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[1][5].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td class=\"gray\">O 5. místo</td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[2][4].win }\">{{ group.playoff[2][4].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[2][4].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[2][5].win }\">{{ group.playoff[2][5].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[2][5].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[1][6].win }\">{{ group.playoff[1][6].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[1][6].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td class=\"gray\">O 7. místo</td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black; border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[2][6].win }\">{{ group.playoff[2][6].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[2][6].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2  ng-class=\"{bold: group.playoff[1][7].win }\">{{ group.playoff[1][7].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[1][7].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[2][7].win }\">{{ group.playoff[2][7].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[2][7].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "    </table>\n" +
    "    <hr>\n" +
    "</div>\n"
  );


  $templateCache.put('hall_of_records.html',
    "<div class=\"row\"><div class=\"columns medium-8 medium-offset-2\">\n" +
    "    <h3>Síň rekordů</h3>\n" +
    "    <div class=\"loader\" ng-hide=\"stats\"></div>\n" +
    "\n" +
    "    <div id=\"hall-of-glory\" ng-cloak ng-show=\"stats\">\n" +
    "        <div>\n" +
    "            Maximální počet týmů na turnaji:\n" +
    "            <b>{{ stats.max_teams_per_tournament.value }} týmů na turnaji</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_teams_per_tournament.instances\">\n" +
    "                    <a ng-href=\"turnaj/{{ instance.pk }}/{{ instance.full_name }}\">{{ instance.full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Maximální počet zápasů na turnaji:\n" +
    "            <b>{{ stats.max_matches_per_tournament.value }} zápasů na turnaji</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_matches_per_tournament.instances\">\n" +
    "                <a ng-href=\"turnaj/{{ instance.pk }}/{{ instance.full_name }}\">{{ instance.full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Tým s nejvíce zápasy:\n" +
    "            <b>{{ stats.max_matches_per_team.value }} zápasů týmu</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_matches_per_team.instances\">\n" +
    "                <a ng-href=\"tym/{{ instance.pk }}/{{ instance.name }}\">{{ instance.name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Tým s nejvíce góly:\n" +
    "            <b>{{ stats.max_goals_per_team.value }} gólů týmu</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_goals_per_team.instances\">\n" +
    "                <a ng-href=\"tym/{{ instance.pk }}/{{ instance.name }}\">{{ instance.name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Tým s nejvíce góly na zápas:\n" +
    "            <b>{{ stats.max_avg_goals_per_team.value | number:1  }} gólů na zápas týmu</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_avg_goals_per_team.instances\">\n" +
    "                <a ng-href=\"tym/{{ instance.pk }}/{{ instance.name }}\">{{ instance.name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Hráč s nejvíce góly na turnaji:\n" +
    "            <b>{{ stats.max_goal_per_tournament_player.value }} gólů</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_goal_per_tournament_player.instances\">\n" +
    "                <a ng-href=\"hrac/{{ instance[0].pk }}/{{ instance[0].full_name }}\">{{ instance[0].full_name }}</a>,\n" +
    "                <a ng-href=\"turnaj/{{ instance[1].pk }}/{{ instance[1].full_name }}\">{{ instance[1].full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Hráč s nejvíce asistencemi na turnaji:\n" +
    "            <b>{{ stats.max_assistance_per_tournament_player.value }} asistencí</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_assistance_per_tournament_player.instances\">\n" +
    "                <a ng-href=\"hrac/{{ instance[0].pk }}/{{ instance[0].full_name }}\">{{ instance[0].full_name }}</a>,\n" +
    "                <a ng-href=\"turnaj/{{ instance[1].pk }}/{{ instance[1].full_name }}\">{{ instance[1].full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Hráčka s nejvíce góly na turnaji:\n" +
    "            <b>{{ stats.max_goal_per_tournament_player_female.value }} gólů</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_goal_per_tournament_player_female.instances\">\n" +
    "                <a ng-href=\"hrac/{{ instance[0].pk }}/{{ instance[0].full_name }}\">{{ instance[0].full_name }}</a>,\n" +
    "                <a ng-href=\"turnaj/{{ instance[1].pk }}/{{ instance[1].full_name }}\">{{ instance[1].full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Hráčka s nejvíce asistencemi na turnaji:\n" +
    "            <b>{{ stats.max_assistance_per_tournament_player_female.value }} asistencí</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_assistance_per_tournament_player_female.instances\">\n" +
    "                <a ng-href=\"hrac/{{ instance[0].pk }}/{{ instance[0].full_name }}\">{{ instance[0].full_name }}</a>,\n" +
    "                <a ng-href=\"turnaj/{{ instance[1].pk }}/{{ instance[1].full_name }}\">{{ instance[1].full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <hr>\n" +
    "        <i>Některé statistiky jsou počítány až od vzniku UfoISu v roce 2016.</i>\n" +
    "    </div>\n" +
    "\n" +
    "</div></div>\n"
  );


  $templateCache.put('home.html',
    "<div class=\"loader\" ng-hide=\"stats\"></div>\n" +
    "\n" +
    "<div class=\"row\"><div class=\"columns medium-6 medium-offset-3\">\n" +
    "    <h3>Ufobalový Informační Systém</h3>\n" +
    "\n" +
    "    <div ng-cloak ng-show=\"stats\">\n" +
    "        V systému je aktuálně:\n" +
    "        <ul>\n" +
    "            <li><b>{{ stats.tournament_count }}</b> turnajů od roku <b>{{ stats.min_year }}</b> až do roku <b>{{ stats.max_year }}</b></li>\n" +
    "            <li><b>{{ stats.player_count }}</b> hráčů z toho <b>{{ stats.player_female_count }}</b> žen a <b>{{ stats.player_male_count }}</b> mužů (zbytek asi velbloudi)</li>\n" +
    "            <li><b>{{ stats.team_count }}</b> týmů s jejich <b>{{ stats.team_on_tournament_count }}</b> účastmi na turnajích</li>\n" +
    "            <li><b>{{ stats.goals | number }}</b> gólů a <b>{{ stats.assists | number }}</b> asistencí</li>\n" +
    "            <li><b>{{ stats.active_players | number }}</b> aktivních hráčů (hrajicích od roku {{ stats.active_players_year }})\n" +
    "        </ul>\n" +
    "    </div>\n" +
    "\n" +
    "    <a target=\"_blank\" href=\"http://ufobal.cz\">Oficiální stránky ufobalu</a>\n" +
    "\n" +
    "    <br>\n" +
    "    <b><a target=\"_blank\" class=\"red\" href=\"/static/záznam_zápasu.pdf\">Stručný návod na zapisování zápasu</a></b>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <div ng-show=\"liveTournament\">\n" +
    "        <h3><a href=\"/turnaj/{{ liveTournament.pk }}\">{{ liveTournament.full_name }}</a></h3>\n" +
    "        <strong>datum:</strong> {{ liveTournament.date | date : \"d. M. yyyy\"}}<br>\n" +
    "        <div ng-show=\"liveTournament.registration_open\"><a href=\"/turnaj/prihlasovani/{{ liveTournament.pk }}\">přihlásit se na turnaj</a> - do {{ liveTournament.registration_to | date : \"d. M. yyyy\"}}</div>\n" +
    "        <span ng-show=\"liveTournament.description\" ng-bind-html=\"to_trusted(liveTournament.description)\"></span>\n" +
    "    </div>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <h3>Jak na UfoIS</h3>\n" +
    "    <a href=\"https://www.youtube.com/watch?v=jxACZ41WJQI\" target=\"_blank\">\n" +
    "        <img src=\"/static/youtube.png\" alt=\"Jak na ufoIS\">\n" +
    "    </a>\n" +
    "</div></div>\n"
  );


  $templateCache.put('pair_account.html',
    "<h2>Párování</h2>\n" +
    "<p ng-show=\"userService.status.logged\">\n" +
    "    Před tím než bodeš moci dělat akce v systému (měnit osobní informace, přihlašovat tým, zaznamenávat zápas, ...),\n" +
    "    je potřeba, aby si svůj účet spároval s hráčem v systému.\n" +
    "    Pokud máš kód, tak ho zadej níže. Jinak se můžeš najít mezi <a href=\"/hraci\">hráči</a> a kliknout na <i>sparovat</i> v pravém horním rohu.\n" +
    "\n" +
    "    Pokud se nemůžeš najít nebo máš jiný problém, prosím obrať se na <a href=\"mailto:thran@centrum.cz\">správce systému</a>.\n" +
    "</p>\n" +
    "\n" +
    "<p ng-hide=\"userService.status.logged\">Pokud chceš spárovat tvůj účet s nějakým hráčem v sytému, musíš se nejdříve přihlásit.</p>\n" +
    "\n" +
    "<div ng-hide=\"userService.status.logged\">\n" +
    "    <a class=\"login-provider standalone\" id=\"login-google\" ng-click=\"userService.loginGoogle()\">\n" +
    "        <img width=\"24\" height=\"24\" class=\"provider-signup-img\" src=\"static/google-icon.png\">\n" +
    "        <span class=\"provider-signup-text\"><b>Google</b></span>\n" +
    "    </a>\n" +
    "        <a class=\"login-provider standalone\" id=\"login-facebook\" ng-click=\"userService.loginFacebook()\">\n" +
    "        <img width=\"24\" height=\"24\" class=\"provider-signup-img\" src=\"static/facebook-icon.png\">\n" +
    "        <span class=\"provider-signup-text\"><b>Facebook</b></span>\n" +
    "    </a>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <form ng-submit=\"login()\"> <div class=\"row medium-6 medium-offset-3\">\n" +
    "        <div class=\"columns medium-12 large-4\">\n" +
    "            <input ng-model=\"credentials.username\" type=\"text\" placeholder=\"jméno\" name=\"username\" />\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-8 large-4\">\n" +
    "            <input ng-model=\"credentials.password\" class=\"columns medium-5\" type=\"password\" placeholder=\"heslo\" name=\"password\" />\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-4 large-4\">\n" +
    "            <input type=\"submit\" class=\"button postfix\" value=\"Přihlásit\">\n" +
    "        </div>\n" +
    "    </div></form>\n" +
    "\n" +
    "     <a class=\"login-provider\" href=\"#\" id=\"login-email\" data-reveal-id=\"sign-up-modal\">\n" +
    "        <i class=\"fi-arrow-up\"></i>\n" +
    "        <span class=\"provider-signup-text\">registrovat</span>\n" +
    "    </a>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div class=\"row\" ng-show=\"userService.status.logged\">\n" +
    "    <div class=\"row collapse\">\n" +
    "        <div class=\"small-9 columns\">\n" +
    "            <input type=\"text\" placeholder=\"kód\" ng-model=\"token\" class=\"columns medium-6\">\n" +
    "        </div>\n" +
    "        <div class=\"small-3 columns\">\n" +
    "            <a href=\"#\" ng-click=\"pairUser(token)\" ng-disabled=\"!token\" class=\"button postfix\">Spárovat</a>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "<span class=\"fi-alert\" ng-show=\"error\">{{ error }}</span>"
  );


  $templateCache.put('player.html',
    "    <div class=\"loader\" ng-hide=\"player\"></div>\n" +
    "\n" +
    "\n" +
    "<div ng-cloak ng-show=\"player\">\n" +
    "    <div>\n" +
    "        <a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "        <hr>\n" +
    "        <a ng-hide=\"edit || !(user.is_staff || user.player.pk === player.pk)\" ng-click=\"edit=true\" class=\"right\"><i class=\"fi-pencil\"></i> upravit profil</a>\n" +
    "        <a ng-hide=\"user.player.pk || player.is_paired || !userStatus.logged\" ng-click=\"pair()\" class=\"right\"><i class=\"fi-arrows-compress\"></i> spárovat</a>\n" +
    "\n" +
    "        <h1> &nbsp; {{ player.nickname }} </h1>\n" +
    "        <h2 ng-class=\"{man: player.gender=='man', woman: player.gender=='woman'}\">\n" +
    "            {{ player.name }} {{ player.lastname }} <span ng-show=\"player.age\">({{ player.age }})</span>\n" +
    "        </h2>\n" +
    "\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-cloak ng-show=\"edit\">\n" +
    "        <hr>\n" +
    "        <a ng-click=\"edit=false\" class=\"right\"><i class=\"fi-x\"></i> zrušit změny</a>\n" +
    "\n" +
    "\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns medium-3\">\n" +
    "                <label>Přezdívka\n" +
    "                    <input type=\"text\" ng-model=\"player.nickname\" />\n" +
    "                </label>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns medium-3\">\n" +
    "                <label>Jméno\n" +
    "                    <input type=\"text\" ng-model=\"player.name\" />\n" +
    "                </label>\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-3\">\n" +
    "                <label>Příjmení\n" +
    "                    <input type=\"text\" ng-model=\"player.lastname\" />\n" +
    "                </label>\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-6\"></div>\n" +
    "        </div>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns medium-3\">\n" +
    "                <label>Pohlaví\n" +
    "                    <select\n" +
    "                        ng-model=\"player.gender\"\n" +
    "                        ng-options=\"gender.id as gender.text for gender in genders\">\n" +
    "                        <option value=\"\">----</option>\n" +
    "                    </select>\n" +
    "                </label>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns medium-3\">\n" +
    "                <label>Datum narození\n" +
    "                    <input type=\"date\" ng-change=\"computeAge()\" ng-model=\"player.birthdate\">\n" +
    "                </label>\n" +
    "            </div>\n" +
    "             <div class=\"columns medium-3\">\n" +
    "                <label>Věk\n" +
    "                    <input disabled type=\"text\" ng-model=\"player.age\" />\n" +
    "                </label>\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-6\"></div>\n" +
    "        </div>\n" +
    "        <i>Datum narození nebude nikde zveřejňováno (pouze jako věk).</i>\n" +
    "        <br>\n" +
    "\n" +
    "        <button ng-hide=\"player.saving\" ng-click=\"save()\">Uložit</button>\n" +
    "        <div ng-show=\"player.saving\" class=\"loader small\"></div>\n" +
    "    </div>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <h3>Turnaje</h3>\n" +
    "\n" +
    "    <table>\n" +
    "        <thead>\n" +
    "            <tr>\n" +
    "                <th>Turnaj</th>\n" +
    "                <th>Tým</th>\n" +
    "                <th class=\"text-right\">Góly</th>\n" +
    "                <th class=\"text-right\">Asistence</th>\n" +
    "                <th class=\"text-right\">Kanada</th>\n" +
    "                <th class=\"text-right\">Umístění</th>\n" +
    "                <th></th>\n" +
    "            </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "            <tr ng-repeat=\"t in player.tournaments | orderBy:'tournament.date':true\">\n" +
    "                <td><a ng-href=\"/turnaj/{{ t.tournament.pk }}/{{ t.tournament.full_name }}/{{ t.pk }}\">{{ t.tournament.full_name }}</a></td>\n" +
    "                <td><a ng-href=\"tym/{{ t.team.pk }}/{{ t.name }}\">{{ t.name}}</a></td>\n" +
    "                <td class=\"text-right\">{{ player.goals[t.tournament.pk] }}</td>\n" +
    "                <td class=\"text-right\">{{ player.assists[t.tournament.pk] }}</td>\n" +
    "                <td class=\"text-right\">{{ player.goals[t.tournament.pk] + player.assists[t.tournament.pk] }}</td>\n" +
    "                <td class=\"text-right\">\n" +
    "                    <span ng-show=\"t.rank\">{{ t.rank }}.</span>\n" +
    "                    <span ng-hide=\"t.rank\">-</span>\n" +
    "                </td>\n" +
    "                <td class=\"text-right\"><a class=\"fi-x\" ng-show=\"user.is_staff || user.player.pk === player.pk\" ng-click=\"removeAttendance(t)\"></a></td>\n" +
    "            </tr>\n" +
    "        </tbody>\n" +
    "    </table>\n" +
    "\n" +
    "    <h3>Karty</h3>\n" +
    "    <table>\n" +
    "        <thead>\n" +
    "            <tr>\n" +
    "                <th></th>\n" +
    "                <th>Zdůvodnění</th>\n" +
    "                <th>Turnaj</th>\n" +
    "                <th>Zápas</th>\n" +
    "            </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "            <tr ng-repeat=\"penalty in player.penalties\">\n" +
    "                <td>{{ penalty.card_verbose }}</td>\n" +
    "                <td>{{ penalty.reason }}</td>\n" +
    "                <td><a ng-href=\"/turnaj/{{ penalty.tournament.pk }}/{{ penalty.tournament.full_name }}\">{{ penalty.tournament.full_name }}</a></td>\n" +
    "                <td><a ng-href=\"/turnaj/zapas/{{ penalty.tournament.pk }}/{{ penalty.match.pk }}\">detail</a></td>\n" +
    "            </tr>\n" +
    "        </tbody>\n" +
    "    </table>\n" +
    "\n" +
    "    <br><br><br><br><br>\n" +
    "    <hr>\n" +
    "    <h4>Přidávání historických turnajů</h4>\n" +
    "    <div class=\"row\" ng-show=\"user.is_staff || user.player.pk === player.pk\">\n" +
    "        <div class=\"text-right columns small-2\">\n" +
    "            <select\n" +
    "                ng-model=\"selectedTournament\"\n" +
    "                ng-options=\"tournament as tournament.full_name for tournament in tournaments | orderBy:'-date'\">\n" +
    "                <option value=\"\">----</option>\n" +
    "            </select>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-2\">\n" +
    "            <select\n" +
    "                ng-model=\"selectedTeam\"\n" +
    "                ng-options=\"team as team.name for team in selectedTournament.teamOnTournaments | orderBy:'name'\">\n" +
    "                <option value=\"\">----</option>\n" +
    "            </select>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-2\"><a class=\"fi-plus\" ng-click=\"addAttendance()\"> přidat</a></div>\n" +
    "        <div class=\"columns small-6\"><div ng-show=\"player.saving\" class=\"loader small\"></div></div>\n" +
    "    </div>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <h4 ng-hide=\"getScoreWithoutTeam(player).length == 0\">What? Turnaje se skórem, ale bez týmu</h4>\n" +
    "\n" +
    "    <div ng-repeat=\"t in getScoreWithoutTeam(player)\">\n" +
    "        {{ t.full_name }} - {{ player.goals[t.pk] ? player.goals[t.pk] : 0 }} golů a {{ player.assists[t.pk] ? player.assists[t.pk] : 0 }} assistencí\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('players.html',
    "<div class=\"loader\" ng-hide=\"players\"></div>\n" +
    "\n" +
    "<div st-persist=\"players\" st-table=\"rows\" st-safe-src=\"players\" ng-cloak class=\"row\" ng-show=\"players\">\n" +
    "    <div class=\"search-box\">\n" +
    "        <input st-search=\"search\" placeholder=\"hledat...\" class=\"input-sm form-control\" type=\"search\">\n" +
    "        <div class=\"fi-x\" st-reset-search></div>\n" +
    "    </div>\n" +
    "\n" +
    "    <table class=\"smart-table\">\n" +
    "        <thead>\n" +
    "        <tr>\n" +
    "            <th width=\"30%\" class=\"clickable\" st-sort=\"nickname\">Jméno</th>\n" +
    "            <th width=\"40%\">Týmy</th>\n" +
    "            <th class=\"text-right clickable\" st-sort=\"goalsSum\" st-descending-first=\"true\">Góly</th>\n" +
    "            <th class=\"text-right clickable\" st-sort=\"assistsSum\" st-descending-first=\"true\">Asistence</th>\n" +
    "            <th class=\"text-right clickable\" st-sort=\"canada\" st-descending-first=\"true\">Kanada</th>\n" +
    "            <th class=\"text-right clickable\" st-sort=\"penalties\" st-descending-first=\"true\">Karty</th>\n" +
    "        </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "        <tr ng-repeat=\"player in rows\">\n" +
    "            <td><a ng-class=\"player.gender\" href=\"\" ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{player.nickname}}</a></td>\n" +
    "            <td>\n" +
    "                <span ng-repeat=\"t in player.teams | orderBy:'-count' \">{{ t.team.name }} ({{ t.count }}x)<span ng-hide=\"$last\">, </span></span>\n" +
    "            </td>\n" +
    "            <td class=\"text-right\">{{ player.goalsSum }}</td>\n" +
    "            <td class=\"text-right\">{{ player.assistsSum }}</td>\n" +
    "            <td class=\"text-right\">{{ player.canada }}</td>\n" +
    "            <td class=\"text-right\">{{ player.penalty_count }}</td>\n" +
    "        </tr>\n" +
    "        </tbody>\n" +
    "        <tfoot>\n" +
    "            <tr>\n" +
    "                <td colspan=\"6\" class=\"text-center\">\n" +
    "                    <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"10\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tfoot>\n" +
    "    </table>\n" +
    "</div>\n"
  );


  $templateCache.put('privacy_policy.html',
    "<h1>Privacy Policy for UfoIS</h1>\n" +
    "\n" +
    "<p>At UfoIS, accessible from is.ufobal.cz, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by UfoIS and how we use it.</p>\n" +
    "\n" +
    "<p>If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us.</p>\n" +
    "\n" +
    "<p>This Privacy Policy applies only to our online activities and is valid for visitors to our website with regards to the information that they shared and/or collect in UfoIS. This policy is not applicable to any information collected offline or via channels other than this website. Our Privacy Policy was created with the help of the <a href=\"https://www.privacypolicygenerator.info/\">Privacy Policy Generator</a>.</p>\n" +
    "\n" +
    "<h2>Consent</h2>\n" +
    "\n" +
    "<p>By using our website, you hereby consent to our Privacy Policy and agree to its terms.</p>\n" +
    "\n" +
    "<h2>Information we collect</h2>\n" +
    "\n" +
    "<p>The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.</p>\n" +
    "<p>If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.</p>\n" +
    "<p>When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.</p>\n" +
    "\n" +
    "<h2>How we use your information</h2>\n" +
    "\n" +
    "<p>We use the information we collect in various ways, including to:</p>\n" +
    "\n" +
    "<ul>\n" +
    "<li>Provide, operate, and maintain our website</li>\n" +
    "<li>Improve, personalize, and expand our website</li>\n" +
    "<li>Understand and analyze how you use our website</li>\n" +
    "<li>Develop new products, services, features, and functionality</li>\n" +
    "<li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</li>\n" +
    "<li>Send you emails</li>\n" +
    "<li>Find and prevent fraud</li>\n" +
    "</ul>\n" +
    "\n" +
    "<h2>Log Files</h2>\n" +
    "\n" +
    "<p>UfoIS follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.</p>\n" +
    "\n" +
    "<h2>Cookies and Web Beacons</h2>\n" +
    "\n" +
    "<p>Like any other website, UfoIS uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.</p>\n" +
    "\n" +
    "<p>For more general information on cookies, please read <a href=\"https://www.privacypolicyonline.com/what-are-cookies/\">\"What Are Cookies\"</a>.</p>\n" +
    "\n" +
    "\n" +
    "\n" +
    "<h2>Advertising Partners Privacy Policies</h2>\n" +
    "\n" +
    "<P>You may consult this list to find the Privacy Policy for each of the advertising partners of UfoIS.</p>\n" +
    "\n" +
    "<p>Third-party ad servers or ad networks uses technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on UfoIS, which are sent directly to users' browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.</p>\n" +
    "\n" +
    "<p>Note that UfoIS has no access to or control over these cookies that are used by third-party advertisers.</p>\n" +
    "\n" +
    "<h2>Third Party Privacy Policies</h2>\n" +
    "\n" +
    "<p>UfoIS's Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options. </p>\n" +
    "\n" +
    "<p>You can choose to disable cookies through your individual browser options. To know more detailed information about cookie management with specific web browsers, it can be found at the browsers' respective websites.</p>\n" +
    "\n" +
    "<h2>CCPA Privacy Rights (Do Not Sell My Personal Information)</h2>\n" +
    "\n" +
    "<p>Under the CCPA, among other rights, California consumers have the right to:</p>\n" +
    "<p>Request that a business that collects a consumer's personal data disclose the categories and specific pieces of personal data that a business has collected about consumers.</p>\n" +
    "<p>Request that a business delete any personal data about the consumer that a business has collected.</p>\n" +
    "<p>Request that a business that sells a consumer's personal data, not sell the consumer's personal data.</p>\n" +
    "<p>If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.</p>\n" +
    "\n" +
    "<h2>GDPR Data Protection Rights</h2>\n" +
    "\n" +
    "<p>We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following:</p>\n" +
    "<p>The right to access – You have the right to request copies of your personal data. We may charge you a small fee for this service.</p>\n" +
    "<p>The right to rectification – You have the right to request that we correct any information you believe is inaccurate. You also have the right to request that we complete the information you believe is incomplete.</p>\n" +
    "<p>The right to erasure – You have the right to request that we erase your personal data, under certain conditions.</p>\n" +
    "<p>The right to restrict processing – You have the right to request that we restrict the processing of your personal data, under certain conditions.</p>\n" +
    "<p>The right to object to processing – You have the right to object to our processing of your personal data, under certain conditions.</p>\n" +
    "<p>The right to data portability – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.</p>\n" +
    "<p>If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.</p>\n" +
    "\n" +
    "<h2>Children's Information</h2>\n" +
    "\n" +
    "<p>Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.</p>\n" +
    "\n" +
    "<p>UfoIS does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately and we will do our best efforts to promptly remove such information from our records.</p>\n" +
    "\n" +
    "<h2>Requesting data deletion</h2>\n" +
    "<p>If you want to delete all your personal data from our servers, you can mail us at exthran@gmail.com requesting data deletion, and we will delete your personal data within 14 days.</p>\n"
  );


  $templateCache.put('referee_feedbacks.html',
    "<a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "<hr>\n" +
    "\n" +
    "<button style=\"float: right\" ng-click=\"getRefereeFeedbacks()\">Obnovit</button>\n" +
    "<h1>Hodnocení rozhodčích - {{ tournament.full_name }}</h1>\n" +
    "\n" +
    "<div class=\"loader\" ng-hide=\"matches || error\"></div>\n" +
    "\n" +
    "<div class=\"red\" ng-show=\"error\">{{ error }}</div>\n" +
    "\n" +
    "<div ng-repeat=\"match in matches\">\n" +
    "    <span ng-class=\"{gray: match.referee_feedback.feedback.star}\">\n" +
    "        <b>{{ match.referee_team.name_pure }}</b>: {{ match.team_one.name_pure }} - {{ match.team_two.name_pure }}\n" +
    "        -\n" +
    "        <a ng-hide=\"match.referee_feedback\" href=\"#\" data-reveal-id=\"feedback-modal\" ng-click=\"newFeedback(match)\">hodnotit</a>\n" +
    "        <a ng-show=\"match.referee_feedback\" href=\"#\" data-reveal-id=\"feedback-modal\" ng-click=\"editFeedback(match)\">upravit</a>\n" +
    "    </span>\n" +
    "    <br><br>\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"feedback-modal\" class=\"large reveal-modal\" data-reveal aria-hidden=\"true\" role=\"dialog\">\n" +
    "    <h1 id=\"modalTitle\">{{ match.referee_team.name_pure }}</h1>\n" +
    "    hlavní rozhodčí: <b>{{ match.referee.full_name }}</b>\n" +
    "    <br>\n" +
    "    <br>\n" +
    "\n" +
    "    <b>Pozitiva</b>\n" +
    "    <div id=\"positives\">\n" +
    "        <div class=\"row\" ng-repeat=\"positive in feedback.positives track by $index\">\n" +
    "            <div class=\"column small-10\">\n" +
    "                <input type=\"text\" ng-model=\"feedback.positives[$index]\">\n" +
    "            </div>\n" +
    "            <div class=\"column small-2\">\n" +
    "                <span style=\"font-size: 1.7rem; cursor: pointer\" ng-click=\"feedback.positives.splice($index, 1)\">&#215;</span>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <button ng-click=\"addPositive()\">Přidat pozitivum</button>\n" +
    "\n" +
    "    <br>\n" +
    "    <hr>\n" +
    "    <b>Negativa</b>\n" +
    "    <div id=\"negatives\">\n" +
    "        <div class=\"row\" ng-repeat=\"negative in feedback.negatives track by $index\">\n" +
    "            <div class=\"column small-10\">\n" +
    "                <input type=\"text\" ng-model=\"feedback.negatives[$index]\">\n" +
    "            </div>\n" +
    "            <div class=\"column small-2\">\n" +
    "                <span style=\"font-size: 1.7rem; cursor: pointer\" ng-click=\"feedback.negatives.splice($index, 1)\">&#215;</span>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <button ng-click=\"addNegative()\">Přidat negativum</button>\n" +
    "\n" +
    "    <hr>\n" +
    "    <b>Komentář</b>\n" +
    "    <textarea name=\"\" id=\"\" cols=\"30\" rows=\"10\" title=\"Komentář\" ng-model=\"feedback.comment\"></textarea>\n" +
    "\n" +
    "    <hr>\n" +
    "     <b>Celkové hodnocení</b>\n" +
    "    <br>\n" +
    "    <br>\n" +
    "    <button class=\"pl-button\" ng-click=\"starChange(-.5)\">-</button>\n" +
    "    <div class=\"stars\"><star-rating-comp\n" +
    "            rating=\"feedback.stars\"\n" +
    "            read-only=\"false\"\n" +
    "            size=\"'large'\"\n" +
    "            get-color=\"starsColor\"\n" +
    "            show-half-stars=\"true\"\n" +
    "            on-click=\"changeRating($event)\"\n" +
    "    ></star-rating-comp></div>\n" +
    "    <button class=\"pl-button\" ng-click=\"starChange(.5)\">+</button>\n" +
    "    <br>\n" +
    "    <br>\n" +
    "    <hr>\n" +
    "\n" +
    "    <button ng-hide=\"match.referee_feedback.saving\" ng-disabled=\"feedback.stars == 0\" ng-click=\"save()\">Uložit</button>\n" +
    "    <div class=\"loader\" ng-show=\"match.referee_feedback.saving\"></div>\n" +
    "</div>\n"
  );


  $templateCache.put('stats_goalies.html',
    "<div class=\"loader\" ng-hide=\"statsGoalies\"></div>\n" +
    "\n" +
    "\n" +
    "<div st-persist=\"statsGoalies\" sort-callback=\"sortCallback()\" st-table=\"rows\" st-safe-src=\"players\" ng-cloak ng-show=\"statsGoalies\">\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns medium-6\">\n" +
    "            <fieldset>\n" +
    "                <legend>Filtrování hráčů</legend>\n" +
    "                <div class=\"fi-x\" st-reset-search></div>\n" +
    "                <div class=\"top-right-gender\">\n" +
    "                    <label class=\"man\" style=\"float: right !important; margin-left: 10px;\"> <input type=\"checkbox\" ng-change=\"filterGender()\" ng-model=\"filter.man\"> </label>\n" +
    "                    <label class=\"woman\" style=\"float: right !important;\"> <input type=\"checkbox\" ng-change=\"filterGender()\" ng-model=\"filter.woman\"> </label>\n" +
    "                </div>\n" +
    "                <label class=\"small-5 columns\">Jméno hráče<input st-search=\"search\" placeholder=\"jméno\" type=\"search\"/></label>\n" +
    "                <label class=\"small-4 columns\">Jméno týmu<input st-search=\"teamsSearch\" placeholder=\"tým\" type=\"search\"/></label>\n" +
    "                <label class=\"small-3 columns\">Zápasů<input ng-model=\"filter.minMatches\" placeholder=\"\" type=\"number\"/></label>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-6\">\n" +
    "            <fieldset>\n" +
    "                <legend>Filtrování turnajů</legend>\n" +
    "                <label class=\"small-3 columns\">od roku<input type=\"number\" placeholder=\"rok\" ng-model=\"filter.yearFrom\"></label>\n" +
    "                <label class=\"small-3 columns\">do roku<input type=\"number\" placeholder=\"rok\" ng-model=\"filter.yearTo\"></label>\n" +
    "                <div class=\"small-6 columns\">\n" +
    "                    <label class=\"small-3 columns\">Nížkov <input type=\"checkbox\" ng-model=\"filter.nizkov\"> </label>\n" +
    "                    <label class=\"small-3 columns\">Brno <input type=\"checkbox\" ng-model=\"filter.brno\"> </label>\n" +
    "                    <label class=\"small-3 columns\">Hala <input type=\"checkbox\" ng-model=\"filter.hala\"> </label>\n" +
    "                    <label class=\"small-3 columns\">Další <input type=\"checkbox\" ng-model=\"filter.other\"> </label>\n" +
    "                </div>\n" +
    "                <div class=\"fi-x\" ng-click=\"resetTournamentFilter()\"></div>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <table class=\"smart-table\">\n" +
    "        <thead>\n" +
    "        <tr>\n" +
    "            <th>#</th>\n" +
    "            <th width=\"10%\" st-sort=\"nickname\" class=\"clickable\">Jméno</th>\n" +
    "            <th ng-repeat=\"tournament in tournaments\"><a ng-href=\"turnaj/{{ tournament.pk }}/{{ tournament.full_name }}\">{{ tournament.full_name }}</a></th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"goalieStats.matchesSum\" st-descending-first='true'>zápasů</th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"goalieStats.shotsSum\" st-descending-first=\"true\">střel</th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"goalieStats.goalsSum\" st-descending-first=\"true\">gólů</th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"goalieStats.success\" st-descending-first=\"true\" st-sort-default=\"true\">úspěšnost</th>\n" +
    "        </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "        <tr ng-repeat=\"player in rows\">\n" +
    "            <th>{{ player.rank }}</th>\n" +
    "            <td><a ng-class=\"player.player.gender\" href=\"\" ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{player.nickname}}</a></td>\n" +
    "            <td ng-repeat=\"tournament in tournaments\" ng-init=\"t = player.goalieStats.tournaments[tournament.pk];\">\n" +
    "                <span ng-show=\"t.success\">\n" +
    "                    <b>{{ t.success * 100 | number:1}}%</b>\n" +
    "                    <br>\n" +
    "                    <span class=\"small \">({{ t.goals }} / {{ t.shots }})</span>\n" +
    "                </span>\n" +
    "            </td>\n" +
    "            <td class=\"text-right\">{{ player.goalieStats.matchesSum }}</td>\n" +
    "            <td class=\"text-right\">{{ player.goalieStats.shotsSum }}</td>\n" +
    "            <td class=\"text-right\">{{ player.goalieStats.goalsSum }}</td>\n" +
    "            <td class=\"text-right\">{{ player.goalieStats.success * 100 | number:1}}%</td>\n" +
    "        </tr>\n" +
    "        </tbody>\n" +
    "        <tfoot>\n" +
    "            <tr>\n" +
    "                <td colspan=\"{{ tournaments.length + 6 }}\" class=\"text-center\">\n" +
    "                    {{ tableState }}\n" +
    "                    <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"10\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tfoot>\n" +
    "    </table>\n" +
    "</div>\n"
  );


  $templateCache.put('stats.html',
    "<div class=\"loader\" ng-hide=\"stats\"></div>\n" +
    "\n" +
    "<div st-persist=\"stats\" sort-callback=\"sortCallback()\" st-table=\"rows\" st-safe-src=\"players\" ng-cloak ng-show=\"stats\">\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns medium-6\">\n" +
    "            <fieldset>\n" +
    "                <legend>Filtrování hráčů</legend>\n" +
    "                <div class=\"fi-x\" st-reset-search></div>\n" +
    "                <div class=\"top-right-gender\">\n" +
    "                    <label class=\"man\" style=\"float: right !important; margin-left: 10px;\"> <input type=\"checkbox\" ng-change=\"filterGender()\" ng-model=\"filter.man\"> </label>\n" +
    "                    <label class=\"woman\" style=\"float: right !important;\"> <input type=\"checkbox\" ng-change=\"filterGender()\" ng-model=\"filter.woman\"> </label>\n" +
    "                </div>\n" +
    "                <label class=\"small-6 columns\">Jméno hráče<input st-search=\"search\" placeholder=\"jméno\" type=\"search\"/></label>\n" +
    "                <label class=\"small-6 columns\">Jméno týmu<input st-search=\"teamsSearch\" placeholder=\"tým\" type=\"search\"/></label>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-6\">\n" +
    "            <fieldset>\n" +
    "                <legend>Filtrování turnajů</legend>\n" +
    "                <label class=\"small-3 columns\">od roku<input type=\"number\" placeholder=\"rok\" ng-model=\"filter.yearFrom\"></label>\n" +
    "                <label class=\"small-3 columns\">do roku<input type=\"number\" placeholder=\"rok\" ng-model=\"filter.yearTo\"></label>\n" +
    "                <div class=\"small-6 columns\">\n" +
    "                    <label class=\"small-3 columns\">Nížkov <input type=\"checkbox\" ng-model=\"filter.nizkov\"> </label>\n" +
    "                    <label class=\"small-3 columns\">Brno <input type=\"checkbox\" ng-model=\"filter.brno\"> </label>\n" +
    "                    <label class=\"small-2 columns\">Hala <input type=\"checkbox\" ng-model=\"filter.hala\"> </label>\n" +
    "                    <label class=\"small-2 columns\">Liga <input type=\"checkbox\" ng-model=\"filter.liga\"> </label>\n" +
    "                    <label class=\"small-2 columns\">Další <input type=\"checkbox\" ng-model=\"filter.other\"> </label>\n" +
    "                </div>\n" +
    "                <div class=\"fi-x\" ng-click=\"resetTournamentFilter()\"></div>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <table class=\"smart-table\">\n" +
    "        <thead>\n" +
    "        <tr>\n" +
    "            <th>#</th>\n" +
    "            <th width=\"10%\" st-sort=\"nickname\" class=\"clickable\">Jméno</th>\n" +
    "            <th ng-repeat=\"tournament in tournaments\"><a ng-href=\"turnaj/{{ tournament.pk }}/{{ tournament.full_name }}\">{{ tournament.full_name }}</a></th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"goalsSumFiltered\" st-descending-first='true'>G</th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"assistsSumFiltered\" st-descending-first=\"true\">A</th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"canadaFiltered\" st-descending-first=\"true\" st-sort-default=\"true\">K</th>\n" +
    "        </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "        <tr ng-repeat=\"player in rows\">\n" +
    "            <th>{{ player.rank }}</th>\n" +
    "            <td><a ng-class=\"player.gender\" href=\"\" ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{player.nickname}}</a></td>\n" +
    "            <td ng-repeat=\"tournament in tournaments\" ng-init=\"g = player.goals[tournament.pk]; a = player.assists[tournament.pk]\">\n" +
    "                <b>{{ g }}</b><span ng-show=\"a && g\">+</span>{{ a }}\n" +
    "            </td>\n" +
    "            <td class=\"text-right\">{{ player.goalsSumFiltered }}</td>\n" +
    "            <td class=\"text-right\">{{ player.assistsSumFiltered }}</td>\n" +
    "            <td class=\"text-right\">{{ player.canadaFiltered }}</td>\n" +
    "        </tr>\n" +
    "        </tbody>\n" +
    "        <tfoot>\n" +
    "            <tr>\n" +
    "                <td colspan=\"{{ tournaments.length + 5 }}\" class=\"text-center\">\n" +
    "                    {{ tableState }}\n" +
    "                    <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"10\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tfoot>\n" +
    "    </table>\n" +
    "</div>\n"
  );


  $templateCache.put('team.html',
    "<div class=\"loader\" ng-hide=\"team\"></div>\n" +
    "\n" +
    "<div ng-cloak ng-show=\"team\">\n" +
    "    <a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <h1>{{ team.name }} <span ng-if=\"team.name_short\">({{ team.name_short }})</span></h1>\n" +
    "    <h2>\n" +
    "        <span ng-repeat=\"n in getTeamNames(team) | filter:'!'+team.name:true | orderBy:'-count'\">{{ n.name }}<span ng-hide=\"$last\">, </span></span>\n" +
    "    </h2>\n" +
    "\n" +
    "    <h3>Turnaje</h3>\n" +
    "\n" +
    "    <table>\n" +
    "        <thead>\n" +
    "            <tr>\n" +
    "                <th>Turnaj</th>\n" +
    "                <th></th>\n" +
    "                <th>Hráči</th>\n" +
    "                <th>Umístění</th>\n" +
    "            </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "            <tr ng-repeat=\"t in team.teamOnTournaments | orderBy:'tournament.date':true\">\n" +
    "                <td><a ng-href=\"/turnaj/{{ t.tournament.pk }}/{{ t.tournament.full_name }}/{{ t.pk }}\">{{ t.tournament.full_name }}</a></td>\n" +
    "                <td><span ng-hide=\"t.name == team.name\">{{ t.name }}</span></td>\n" +
    "\n" +
    "                <td>\n" +
    "                    <span ng-repeat=\"player in t.players\">\n" +
    "                        <a ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{ player.nickname }}</a>\n" +
    "                        <span ng-hide=\"$last\">, </span>\n" +
    "                    </span>\n" +
    "                </td>\n" +
    "                <td class=\"text-right\">\n" +
    "                    <span ng-show=\"t.rank\">{{ t.rank }}.</span>\n" +
    "                    <span ng-hide=\"t.rank\">-</span>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tbody>\n" +
    "    </table>\n" +
    "\n" +
    "</div>"
  );


  $templateCache.put('teams.html',
    "<div class=\"loader\" ng-hide=\"teams\"></div>\n" +
    "\n" +
    "<div st-persist=\"teams\" st-table=\"rows\" st-safe-src=\"teams\" ng-cloak ng-show=\"teams\">\n" +
    "    <div class=\"search-box\">\n" +
    "        <input st-search=\"namesSearch\" placeholder=\"hledat...\" class=\"input-sm form-control\" type=\"search\"/>\n" +
    "        <div class=\"fi-x\" st-reset-search></div>\n" +
    "    </div>\n" +
    "    <table class=\"smart-table\">\n" +
    "        <thead>\n" +
    "        <tr>\n" +
    "            <th width=\"20%\" class=\"clickable\" st-sort=\"name\">Jméno</th>\n" +
    "            <th width=\"40%\"></th>\n" +
    "            <th width=\"30%\" class=\"clickable\" st-sort=\"medalsValue\">Umístění</th>\n" +
    "            <th>Počet turnajů</th>\n" +
    "        </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "        <tr ng-repeat=\"team in rows\">\n" +
    "            <td><a ng-href=\"/tym/{{ team.pk }}/{{ team.name }}\">{{ team.name }}</a></td>\n" +
    "            <td>\n" +
    "                <span ng-repeat=\"n in team.names | filter:'!'+team.name:true | orderBy:'-count'\">{{ n.name }}<span ng-hide=\"$last\">, </span></span>\n" +
    "            </td>\n" +
    "            <td>\n" +
    "                <span ng-repeat=\"count in team.medals track by $index\" ng-show=\"count\">\n" +
    "                    <span class=\"medal medal-{{ $index + 1 }}\">{{ count }}&times;</span>\n" +
    "                </span>\n" +
    "            </td>\n" +
    "            <td>{{ team.teamOnTournaments.length }}</td>\n" +
    "        </tr>\n" +
    "        </tbody>\n" +
    "        <tfoot>\n" +
    "            <tr>\n" +
    "                <td colspan=\"4\" class=\"text-center\">\n" +
    "                    <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"10\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tfoot>\n" +
    "    </table>\n" +
    "</div>\n"
  );


  $templateCache.put('tournament_live.html',
    "<a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "<hr>\n" +
    "<div class=\"loader\" ng-hide=\"matchesLoaded\"></div>\n" +
    "<div ng-show=\"matchesLoaded\">\n" +
    "\n" +
    "    <a class=\"right\" href=\"/skupiny/{{ tournament.pk }}\"><button>Skupiny</button></a>\n" +
    "    <a class=\"right\" style=\"margin-right: 10px;\" href=\"/turnaj/{{ tournament.pk }}/{{ tournament.full_name }}\"><button>Statistiky</button></a>\n" +
    "    <a class=\"right\" style=\"margin: 0 10px;\" href=\"/turnaj/{{ tournament.pk }}\"><button>Správa turnaje</button></a>\n" +
    "    <div class=\"small switch right text-right\" style=\"margin-bottom: 0\">živě<br><input id='refresh' type=\"checkbox\" ng-model=\"refresh\"><label for=\"refresh\"></label></div>\n" +
    "\n" +
    "    <h1>{{ tournament.full_name }}</h1>\n" +
    "    <hr>\n" +
    "    <h4>Probíhající zápasy </h4>\n" +
    "    <div ng-repeat=\"match in tournament.matches | filter:{state: 'ongoing'} | orderBy:['-pk']\" class=\"row hoverLight stripes\">\n" +
    "        <div class=\"columns small-1 one-line\">{{ match.place }}</div>\n" +
    "        <div class=\"text-right columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_one.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_two.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-2 one-line\">\n" +
    "            <span ng-show=\"match.start\"><b>{{ match.score_one }}:{{ match.score_two }}<span ng-show=\"match.with_shootout\">P</span></b></span>\n" +
    "            <span ng-show=\"match.start && ! match.end\">hraje se</span>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-3 one-line\">({{ match.referee_team.name_pure }})</div>\n" +
    "    </div>\n" +
    "\n" +
    "    <br>\n" +
    "    <h4>Ukončené zápasy </h4>\n" +
    "    <div ng-repeat=\"match in tournament.matches | filter:{state: 'ended'} | orderBy:['-pk']\" class=\"row hoverLight stripes\">\n" +
    "        <div class=\"columns small-1 one-line\">{{ match.place }}</div>\n" +
    "        <div class=\"text-right columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_one.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_two.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-2 one-line\">\n" +
    "            <span ng-show=\"match.start\"><b>{{ match.score_one }}:{{ match.score_two }}<span ng-show=\"match.with_shootout\">P</span></b></span>\n" +
    "            <span ng-show=\"match.start && ! match.end\">hraje se</span>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-3 one-line\">({{ match.referee_team.name_pure }})</div>\n" +
    "    </div>\n" +
    "\n" +
    "    <br>\n" +
    "    <h4>Budoucí zápasy </h4>\n" +
    "    <div ng-repeat=\"match in tournament.matches | filter:{state: 'waiting'} | orderBy:['-pk']\" class=\"row hoverLight stripes\">\n" +
    "        <div class=\"columns small-1 one-line\">{{ match.place }}</div>\n" +
    "        <div class=\"text-right columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_one.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_two.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-2 one-line\">\n" +
    "            <span ng-show=\"match.start\"><b>{{ match.score_one }}:{{ match.score_two }}<span ng-show=\"match.with_shootout\">P</span></b></span>\n" +
    "            <span ng-show=\"match.start && ! match.end\">hraje se</span>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-3 one-line\">({{ match.referee_team.name_pure }})</div>\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('tournament_main.html',
    "<a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "<hr>\n" +
    "<div class=\"loader\" ng-hide=\"matchesLoaded\"></div>\n" +
    "<div ng-hide=\"user.is_authorized\">Přihlaš se prosím účtem, který je spárovaný s nějakým hráčem.</div>\n" +
    "<div class=\"text-center\" ng-show=\"matchesLoaded && user.is_authorized\">\n" +
    "\n" +
    "    <a class=\"right\" href=\"/skupiny/{{ tournament.pk }}\"><button>Skupiny</button></a>\n" +
    "    <a class=\"right\" style=\"margin-right: 10px;\" href=\"/turnaj/{{ tournament.pk }}/{{ tournament.full_name }}\"><button>Statistiky</button></a>\n" +
    "    <a class=\"right\" style=\"margin-right: 10px;\" href=\"/turnaj-zive/{{ tournament.pk }}\"><button>Divácký pohled</button></a>\n" +
    "    <a class=\"right\" style=\"margin-right: 10px;\" href=\"/hodnoceni_rozhodcich/{{ tournament.pk }}\"><button>Hodnocení rozhodčích</button></a>\n" +
    "    <h1>{{ tournament.full_name }}</h1>\n" +
    "    <hr>\n" +
    "    <div ng-show=\"tournament.is_tournament_open || user.is_staff\">\n" +
    "        <h3>Zápasy</h3>\n" +
    "        <a href=\"#\" class=\"fi-plus\" data-reveal-id=\"newMatch\"> Nový zápas</a>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns large-6 panel\" ng-repeat=\"field in tournament.fields\" equalizer=\"'places'\" style=\"height: 10px\">\n" +
    "                <h4>Hřiště {{ field }}</h4>\n" +
    "\n" +
    "                <div ng-repeat=\"match in tournament.matches | filter:{place: field}:strict | orderBy:['pk'] \" class=\"row hoverLight stripes\">\n" +
    "                    <div class=\"columns small-1 one-line\">{{ $index + 1 }}.</div>\n" +
    "                    <div class=\"text-right columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}/edit\"><b>{{ match.team_one.name_pure }}</b></a></div>\n" +
    "                    <div class=\"text-left columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}/edit\"><b>{{ match.team_two.name_pure }}</b></a></div>\n" +
    "                    <div class=\"text-left columns small-2 one-line\">({{ match.referee_team.name_pure }})</div>\n" +
    "                    <div class=\"columns small-3 one-line\">\n" +
    "                        <span ng-show=\"match.start\"><b>{{ match.score_one }}:{{ match.score_two }}<span ng-show=\"match.with_shootout\">P</span></b></span>\n" +
    "                        <span ng-show=\"match.start && ! match.end\">hraje se</span>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <hr>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"row\">\n" +
    "        <div ng-show=\"tournament.registration_open\"><a href=\"/turnaj/prihlasovani/{{ tournament.pk }}\">přihlásit se na turnaj</a> - do {{ tournament.registration_to | date : \"d. M. yyyy\"}}</div>\n" +
    "        <h3>Týmy</h3>\n" +
    "        <div class=\"small-6 medium-4 large-3 columns\" ng-repeat=\"team in tournament.teamOnTournaments | orderBy:'name'\"><a href=\"/turnaj/{{ tournament.pk }}/tym/{{ team.pk }}\">{{ team.name }}</a></div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div id=\"newMatch\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <label>Tým 1\n" +
    "        <select ng-model=\"match.team_one\" ng-change=\"match.saving_error=null\"\n" +
    "                ng-options=\"team as team.name for team in tournament.teamOnTournaments | orderBy:'name'\">\n" +
    "            <option value=\"\">----</option>\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Tým 2\n" +
    "        <select ng-model=\"match.team_two\" ng-change=\"match.saving_error=null\"\n" +
    "                ng-options=\"team as team.name for team in tournament.teamOnTournaments | orderBy:'name'\">\n" +
    "            <option value=\"\">----</option>\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Rozhodčí tým\n" +
    "        <select ng-model=\"match.referee_team\" ng-change=\"match.saving_error=null\"\n" +
    "                ng-options=\"team as team.name for team in tournament.teamOnTournaments | orderBy:'name'\">\n" +
    "            <option value=\"\">----</option>\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Hřiště</label>\n" +
    "    <p>\n" +
    "        <label ng-repeat=\"field in tournament.fields\">\n" +
    "            <input type=\"radio\" name=\"x\" ng-model=\"$parent.match.place\" ng-value=\"field\">\n" +
    "            {{ field }}\n" +
    "        </label>\n" +
    "    </p>\n" +
    "\n" +
    "    <button ng-hide=\"match.saving\" ng-disabled=\"!match.team_one || !match.referee_team || !match.team_two || !match.place \" ng-click=\"addMatch()\">Vytvořit</button>\n" +
    "    <label ng-show=\"match.saving_error\" class=\"red\">{{ match.saving_error }}</label>\n" +
    "    <div class=\"loader\" ng-show=\"match.saving\"></div>\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n"
  );


  $templateCache.put('tournament_match.html',
    "<a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "<hr>\n" +
    "<div class=\"loader\" ng-hide=\"match\"></div>\n" +
    "\n" +
    "<div ng-show=\"match\">\n" +
    "    <div class=\"text-center\">\n" +
    "        <div class=\"small switch text-right right\" style=\"margin-bottom: 0\" ng-show=\"onlyView\">živě<br><input id='refresh' type=\"checkbox\" ng-model=\"refresh\"><label for=\"refresh\"></label></div>\n" +
    "        <span ng-show=\"match.halftime > 0\" ng-click=\"nextHalftime()\">{{ match.halftime }}. poločas</span>\n" +
    "        <span ng-show=\"match.halftime === null\">zápas ukončen &nbsp;&nbsp;&nbsp;&nbsp; <a href back>&lsaquo; zpět na přehled</a></span>\n" +
    "        <span ng-show=\"match.halftime > 0 && !onlyView\" ng-click=\"nextHalftime()\" class=\"clickable fi-arrow-right\"></span>\n" +
    "    </div>\n" +
    "    <div class=\"timer one-line\" ng-show=\"match.halftime !== null\" ng-hide=\"onlyView\">\n" +
    "        <span ng-click=\"timer.addTime(5000)\" class=\"clickable fi-rewind\"></span>\n" +
    "        <span ng-click=\"timer.addTime(1000)\" class=\"clickable line arrow-left\"></span>\n" +
    "        <span><span class=\"hide-for-small\">&nbsp;&nbsp;</span></span>\n" +
    "        <span ng-class=\"{pressbutton: match.halftime === 0}\">\n" +
    "            <span ng-click=\"start();\" ng-show=\"!timer.running\" class=\"clickable fi-play\"></span>\n" +
    "            <span ng-click=\"timer.stop()\" ng-show=\"timer.running\" class=\"clickable fi-pause\"></span>\n" +
    "            <timer ng-click=\"start(true);\" class=\"clickable\" countdown=\"true\" interval=\"200\" interface=\"timer\">\n" +
    "                <b ng-class=\"{red: negative}\">{{ sign }}{{ mminutes }}:{{ sseconds }}.{{ deciseconds }}</b>\n" +
    "            </timer>\n" +
    "        </span>\n" +
    "        <span><span class=\"hide-for-small\">&nbsp;&nbsp;</span></span>\n" +
    "        <span ng-click=\"timer.addTime(-1000)\" class=\"clickable line arrow-right\"></span>\n" +
    "        <span ng-click=\"timer.addTime(-5000)\" class=\"clickable fi-fast-forward\"></span>\n" +
    "    </div>\n" +
    "\n" +
    "    <hr>\n" +
    "    <div class=\"text-center\">\n" +
    "        <span class=\"clickable\" ng-click=\"startChangeReferee()\">píská: {{ match.referee_team.name_pure }} - <b ng-show=\"match.referee\"> {{ match.referee.nickname }}</b></span>\n" +
    "        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\n" +
    "        <span class=\"show-for-small-only\">\n" +
    "            <label style=\"display: inline !important;\"><span style=\"display: inline;\" ng-hide=\"onlyView\"><input type=\"checkbox\" ng-model=\"edit\" ng-hide=\"onlyView\"> úpravy</span></label>\n" +
    "            <label style=\"display: inline !important;\"><span style=\"display: inline;\"><input type=\"checkbox\" ng-model=\"showShots\"> střely</span></label>\n" +
    "            &nbsp;&nbsp;&nbsp;\n" +
    "            <i class=\"fi-loop\" ng-click=\"switchTeamSides();\"></i>\n" +
    "        </span>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6 medium-5 text-right clickable\" ng-class=\"match.team1.color\" ng-click=\"newGoalieChange(match.team1)\">\n" +
    "            <b ng-show=\"match.team1.goalie\">{{ match.team1.goalie.nickname }}</b>\n" +
    "            <span ng-hide=\"match.team1.goalie\">bez brankáře</span>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up text-center\">&nbsp;</div>\n" +
    "        <div class=\"columns small-6 medium-5 clickable\" ng-class=\"match.team2.color\" ng-click=\"newGoalieChange(match.team2)\">\n" +
    "            <b ng-show=\"match.team2.goalie\">{{ match.team2.goalie.nickname }}</b>\n" +
    "            <span ng-hide=\"match.team2.goalie\">bez brankáře</span>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6 medium-5 text-right one-line\" style=\"font-size: 2em;\" ng-class=\"match.team1.color\"><b>{{ match.team1.name_pure }}</b></div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up text-center\"><i class=\"fi-loop\" ng-click=\"switchTeamSides();\"></i></div>\n" +
    "        <div class=\"columns small-6 medium-3 one-line\" style=\"font-size: 2em;\" ng-class=\"match.team2.color\"><b>{{ match.team2.name_pure }}</b></div>\n" +
    "\n" +
    "        <div class=\"columns medium-2 show-for-medium-up\">\n" +
    "            <div class=\"small switch right\" style=\"margin-bottom: 0\" ng-hide=\"onlyView\">úpravy <br><input id='edit' type=\"checkbox\" ng-model=\"edit\"><label for=\"edit\"></label></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "\n" +
    "    <div class=\"row\" ng-show=\"match.halftime === 1 || match.halftime === 2\">\n" +
    "        <div class=\"columns small-6 medium-5 text-right\">\n" +
    "            <div ng-repeat=\"event in match.events | filter : penaltyTimerFilter(1) | orderBy : '-time'\">\n" +
    "                <div ng-class=\"event.team.color\"><span class=\"fi-alert\"> {{ getRemainingPenaltyTime(event) }} - <b>{{ event.data.player.nickname }}</b></span> </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up text-center\">&nbsp;</div>\n" +
    "        <div class=\"columns small-6 medium-5\">\n" +
    "            <div ng-repeat=\"event in match.events | filter :penaltyTimerFilter(2) | orderBy : '-time'\">\n" +
    "                <div ng-class=\"event.team.color\"><span class=\"fi-alert\"> {{ getRemainingPenaltyTime(event) }} - <b>{{ event.data.player.nickname }}</b></span> </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6 medium-5 text-right\" ng-class=\"match.team1.color\"\n" +
    "        ng-init=\"\">\n" +
    "            {{ match.team1.counts.goals / (match.team1.counts.goals + match.team1.counts.shots) * 100 | number:0 }}% -\n" +
    "            {{ match.team1.counts.shots + match.team1.counts.goals }}\n" +
    "            &nbsp;&nbsp;&nbsp;\n" +
    "            <span style=\"font-size: 3em;\">{{ match.team1.counts.goals }}</span>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up text-center\">&nbsp;</div>\n" +
    "        <div class=\"columns small-6 medium-3\" ng-class=\"match.team2.color\">\n" +
    "            <span style=\"font-size: 3em;\">{{ match.team2.counts.goals }}</span>\n" +
    "            &nbsp;&nbsp;&nbsp;\n" +
    "            {{ match.team2.counts.shots + match.team2.counts.goals }} -\n" +
    "            {{ match.team2.counts.goals / (match.team2.counts.goals + match.team2.counts.shots) * 100 | number:0 }}%\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up\">\n" +
    "            <div class=\"small switch right\">střely <br><input id='showShots' type=\"checkbox\" ng-model=\"showShots\"><label for=\"showShots\"></label></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"row\" ng-show=\"!onlyView && (edit || match.halftime !== null)\">\n" +
    "        <div class=\"show-for-small columns small-6 medium-5 text-right\"><h3>\n" +
    "            <span class=\"pressbutton\" ng-click=\"saveShot(match.team1)\">střela</span>\n" +
    "            <br><br>\n" +
    "            <span ng-click=\"newPenalty(match.team1)\" class=\"clickable fi-alert\"></span>\n" +
    "            <span class=\"pressbutton\" ng-click=\"newGoal(match.team1)\">gól</span>\n" +
    "        </h3></div>\n" +
    "        <div class=\"columns small-6 medium-5 show-for-medium-up text-right\"><h3>\n" +
    "            <span ng-click=\"newPenalty(match.team1)\" class=\"clickable fi-alert\"></span>\n" +
    "            <span class=\"pressbutton\" ng-click=\"saveShot(match.team1)\">střela</span>\n" +
    "            <span class=\"pressbutton\" ng-click=\"newGoal(match.team1)\">gól</span>\n" +
    "        </h3></div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up text-center\">&nbsp;</div>\n" +
    "        <div class=\"show-for-small columns small-6 medium-5\"><h3>\n" +
    "            <span class=\"pressbutton\" ng-click=\"saveShot(match.team2)\">střela</span>\n" +
    "            <br><br>\n" +
    "            <span class=\"pressbutton\" ng-click=\"newGoal(match.team2)\">gól</span>\n" +
    "            <span ng-click=\"newPenalty(match.team2)\" class=\"clickable fi-alert\"></span>\n" +
    "        </h3></div>\n" +
    "        <div class=\"columns small-6 medium-5 show-for-medium-up\"><h3>\n" +
    "            <span class=\"pressbutton\" ng-click=\"newGoal(match.team2)\">gól</span>\n" +
    "            <span class=\"pressbutton\" ng-click=\"saveShot(match.team2)\">střela</span>\n" +
    "            <span ng-click=\"newPenalty(match.team2)\" class=\"clickable fi-alert\"></span>\n" +
    "        </h3></div>\n" +
    "    </div>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <div ng-repeat=\"event in match.events | filter : eventFilter | orderBy : '-time'\" class=\"row hoverLight show-for-small-down stripes\">\n" +
    "        <div class=\"columns small-2 medium-2 text-right\">\n" +
    "            &nbsp;\n" +
    "            <span ng-hide=\"event.saved\" class=\"fi-unlink\"></span>\n" +
    "            <span ng-show=\"edit && (event.type == 'goal' || event.type == 'shot' || event.type == 'penalty')\"\n" +
    "                  ng-click=\"remove(event)\" class=\"fi-x clickable\"></span>\n" +
    "            <span ng-show=\"edit && (event.type == 'goal')\"\n" +
    "                  ng-click=\"startEditGoal(event)\" class=\"fi-pencil clickable\"></span>\n" +
    "            <span ng-show=\"edit && (event.type == 'penalty')\"\n" +
    "                  ng-click=\"startEditPenalty(event)\" class=\"fi-pencil clickable\"></span>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-2 medium-1 text-right\"><hr ng-show=\"event.type == 'halftime'\">{{ event.time | limitTo : -5 }}</div>\n" +
    "        <div class=\"columns small-8 medium-9\">\n" +
    "            <div ng-show=\"event.type == 'goal'\" ng-class=\"event.team.color\">gól: <b>{{ event.data.shooter.nickname }}</b><span ng-show=\"event.data.assistance\"> - {{ event.data.assistance.nickname }}</span></div>\n" +
    "            <div ng-show=\"event.type == 'shot'\" ng-class=\"event.team.color\">střela<span ng-show=\"event.data.shooter\">: {{ event.data.shooter.nickname }}</span></div>\n" +
    "            <div ng-show=\"event.type == 'penalty'\" ng-class=\"event.team.color\"><span class=\"fi-alert\"> {{ event.data.cardText }} karta</span>: <b>{{ event.data.player.nickname }}</b> - {{ event.data.reason }}</div>\n" +
    "            <div ng-show=\"event.type == 'halftime'\"><hr><b>konec poločasu</b> </div>\n" +
    "            <div ng-show=\"event.type == 'end'\"><b>konec zápasu</b></div>\n" +
    "            <div ng-show=\"event.type== 'goalieChange'\" ng-class=\"event.team.color\"><span class=\"fi-loop\"> změna brankáře</span>: <b>{{ event.data.goalie.nickname }}</b></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-repeat=\"event in match.events | filter : eventFilter | orderBy : '-time'\" class=\"row hoverLight show-for-medium-up\">\n" +
    "        <div class=\"columns medium-1 text-right\">\n" +
    "            &nbsp;\n" +
    "            <span ng-hide=\"event.saved\" class=\"fi-unlink\"></span>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"columns medium-4\" ng-show=\"event.team === match.team2\">&nbsp;</div>\n" +
    "        <div class=\"columns medium-4 text-right\" ng-hide=\"event.team === match.team2\">\n" +
    "            <div ng-show=\"event.type == 'goal'\" ng-class=\"event.team.color\">gól: <b>{{ event.data.shooter.nickname }}</b>\n" +
    "                <span ng-show=\"event.data.assistance\"> - {{ event.data.assistance.nickname }}</span>\n" +
    "                <span ng-show=\"event.data.type == 'shootout'\"> - penaltový rozstřel</span>\n" +
    "                <span ng-show=\"event.data.type == 'penalty'\"> - penalta</span>\n" +
    "            </div>\n" +
    "            <div ng-show=\"event.type == 'shot'\" ng-class=\"event.team.color\">střela<span ng-show=\"event.data.shooter\">: {{ event.data.shooter.nickname }}</span></div>\n" +
    "            <div ng-show=\"event.type == 'penalty'\" ng-class=\"event.team.color\"><span class=\"fi-alert\"> {{ event.data.cardText }} karta</span>: <b>{{ event.data.player.nickname }}</b> - {{ event.data.reason }}</div>\n" +
    "            <div ng-show=\"event.type == 'halftime'\"><hr><b>konec poločasu</b> </div>\n" +
    "            <div ng-show=\"event.type == 'end'\"><b>konec zápasu</b></div>\n" +
    "            <div ng-show=\"event.type== 'goalieChange'\" ng-class=\"event.team.color\"><span class=\"fi-loop\"> změna brankáře</span>: <b>{{ event.data.goalie.nickname }}</b></div>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"columns medium-2 text-center\">\n" +
    "            <span ng-show=\"edit && (event.type == 'goal')\"\n" +
    "                  ng-click=\"startEditGoal(event)\" class=\"fi-pencil clickable\"></span>\n" +
    "            <span ng-show=\"edit && (event.type == 'penalty')\"\n" +
    "                  ng-click=\"startEditPenalty(event)\" class=\"fi-pencil clickable\"></span>\n" +
    "\n" +
    "            <hr ng-show=\"event.type === 'halftime'\">\n" +
    "            {{ event.time | limitTo : -5 }}\n" +
    "\n" +
    "            <span ng-show=\"edit && (event.type == 'goal' || event.type == 'shot' || event.type == 'penalty')\"\n" +
    "                  ng-click=\"remove(event)\" class=\"fi-x clickable\"></span>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"columns medium-5\" ng-show=\"event.team === match.team1\">&nbsp;</div>\n" +
    "        <div class=\"columns medium-5\" ng-hide=\"event.team === match.team1\">\n" +
    "            <div ng-show=\"event.type == 'goal'\" ng-class=\"event.team.color\">gól: <b>{{ event.data.shooter.nickname }}</b>\n" +
    "                <span ng-show=\"event.data.assistance\"> - {{ event.data.assistance.nickname }}</span>\n" +
    "                <span ng-show=\"event.data.type == 'shootout'\"> - penaltový rozstřel</span>\n" +
    "                <span ng-show=\"event.data.type == 'penalty'\"> - penalta</span>\n" +
    "            </div>\n" +
    "            <div ng-show=\"event.type == 'shot'\" ng-class=\"event.team.color\">střela<span ng-show=\"event.data.shooter\">: {{ event.data.shooter.nickname }}</span></div>\n" +
    "            <div ng-show=\"event.type == 'penalty'\" ng-class=\"event.team.color\"><span class=\"fi-alert\"> {{ event.data.cardText }} karta</span>: <b>{{ event.data.player.nickname }}</b> - {{ event.data.reason }}</div>\n" +
    "            <div ng-show=\"event.type == 'halftime'\"><hr><b>konec poločasu</b> </div>\n" +
    "            <div ng-show=\"event.type == 'end'\"><b>konec zápasu</b></div>\n" +
    "            <div ng-show=\"event.type== 'goalieChange'\" ng-class=\"event.team.color\"><span class=\"fi-loop\"> změna brankáře</span>: <b>{{ event.data.goalie.nickname }}</b></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"editGoal\" class=\"medium reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Gól - {{ goal.team.name_pure }}</h2>\n" +
    "    <label>Čas\n" +
    "        <input type=\"text\" ng-model=\"goal.time\">\n" +
    "    </label>\n" +
    "    <label>Střelec\n" +
    "        <select\n" +
    "            ng-model=\"goal.shooter\"\n" +
    "            ng-options=\"player as player.nickname for player in goal.team.players\">\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Asistence\n" +
    "        <select\n" +
    "                ng-model=\"goal.assistance\"\n" +
    "                ng-options=\"player as player.nickname for player in goal.team.players\">\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Typ gólu {{ goal.type }}:\n" +
    "        <select ng-model=\"goal.type\">\n" +
    "            <option value=\"normal\">Běžný</option>\n" +
    "            <option value=\"penalty\">Penalta</option>\n" +
    "            <option value=\"shootout\">Penaltový rozstřel</option>\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <button ng-click=\"editGoal()\">Upravit</button>\n" +
    "\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"newGoal\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Gól - {{ goal.team.name_pure }} - <span ng-hide=\"goal.shooter\">střelec</span><span ng-show=\"goal.shooter\">asistence</span></h2>\n" +
    "    <div class=\"row\" ng-hide=\"goal.shooter\">\n" +
    "        <div\n" +
    "                class=\"columns medium-6 large-4\"\n" +
    "                ng-repeat=\"player in goal.team.players\"\n" +
    "                ng-click=\"goal.shooter = player\"\n" +
    "        ><div class=\"pressbutton\"><h5>{{ player.nickname }}</h5></div></div>\n" +
    "        <div class=\"columns medium-6 large-4\" >&nbsp;</div>\n" +
    "    </div>\n" +
    "    <div class=\"row\" ng-show=\"goal.shooter\">\n" +
    "        <div\n" +
    "                class=\"columns medium-6 large-4\"\n" +
    "                ng-repeat=\"player in goal.team.players\"\n" +
    "                ng-click=\"saveGoal(player)\"\n" +
    "        >\n" +
    "            <div style=\"padding: 10px 20px; margin: 6px;\" ng-show=\"player == goal.shooter\"><h5>&nbsp;</h5></div>\n" +
    "            <div class=\"pressbutton\" ng-show=\"player != goal.shooter\"><h5>{{ player.nickname }}</h5></div></div>\n" +
    "        <div class=\"columns medium-6 large-4\" ng-click=\"saveGoal(null);\"><div class=\"pressbutton red\"><h5>nikdo</h5></div></div>\n" +
    "        <div class=\"columns medium-6 large-4\" ng-click=\"goal.type = 'penalty'; saveGoal(null);\"><div class=\"pressbutton red\"><h5>penalta</h5></div></div>\n" +
    "        <div class=\"columns medium-6 large-4\" ng-click=\"goal.type = 'shootout'; saveGoal(null);\"><div class=\"pressbutton red\"><h5>rozstřel</h5></div></div>\n" +
    "    </div>\n" +
    "\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"editPenalty\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Karta - {{ penalty.team.name_pure }}</h2>\n" +
    "    <label>Čas\n" +
    "        <input type=\"text\" ng-model=\"penalty.time\">\n" +
    "    </label>\n" +
    "    <label>Hráč\n" +
    "        <select\n" +
    "                ng-model=\"penalty.player\"\n" +
    "                ng-options=\"player as player.nickname for player in penalty.team.players\">\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Karta\n" +
    "        <select\n" +
    "                ng-model=\"penalty.card\"\n" +
    "                ng-options=\"card.id as card.text for card in cards\">\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Odůvodnění\n" +
    "        <textarea ng-model=\"penalty.reason\"></textarea>\n" +
    "    </label>\n" +
    "    <button ng-click=\"editPenalty()\">Upravit</button>\n" +
    "\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div id=\"newPenalty\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Karta - {{ penalty.team.name_pure }}<span ng-show=\"penalty.player\"> - {{ penalty.player.nickname }}</span></h2>\n" +
    "    <div class=\"row\" ng-hide=\"penalty.player\">\n" +
    "        <div\n" +
    "                class=\"columns medium-6 large-4\"\n" +
    "                ng-repeat=\"player in penalty.team.players\"\n" +
    "                ng-click=\"penalty.player = player\"\n" +
    "        ><div class=\"pressbutton\"><h5>{{ player.nickname }}</h5></div></div>\n" +
    "    </div>\n" +
    "    <div ng-show=\"penalty.player\">\n" +
    "        <label>Karta\n" +
    "            <select\n" +
    "                    ng-model=\"penalty.card\"\n" +
    "                    ng-options=\"card.id as card.text for card in cards\">\n" +
    "            </select>\n" +
    "        </label>\n" +
    "        <label>Odůvodnění\n" +
    "            <select ng-model=\"penalty.reason\">\n" +
    "                <option></option>\n" +
    "                <option>Útočný faul</option>\n" +
    "                <option>Nebezpečná střela</option>\n" +
    "                <option>Obraný faul</option>\n" +
    "                <option>Držení</option>\n" +
    "                <option>Drsná hra</option>\n" +
    "                <option>Nesportovní chování</option>\n" +
    "                <option>Urážení rozhodčího</option>\n" +
    "                <option>Jiné</option>\n" +
    "            </select>\n" +
    "            <input ng-model=\"penalty.reason_extra\" placeholder=\"dodatečné info\">\n" +
    "        </label>\n" +
    "        <button ng-show=\"penalty.reason\" ng-click=\"savePenalty()\">Udělit</button>\n" +
    "    </div>\n" +
    "\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div id=\"newGoalieChange\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Změna brankáře - {{ goalieChange.team.name_pure }}</h2>\n" +
    "    <div class=\"row\" ng-hide=\"goalieChange.goalie\" >\n" +
    "        <div\n" +
    "                class=\"columns medium-6 large-4\"\n" +
    "                ng-repeat=\"player in goalieChange.team.players\"\n" +
    "                ng-click=\"goalieChange.goalie = player; saveGoalieChange()\"\n" +
    "        ><div class=\"pressbutton\"><h5>{{ player.nickname }}</h5></div></div>\n" +
    "    </div>\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div id=\"changeReferee\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Volba hlavního rozhodčího</h2>\n" +
    "    <label>\n" +
    "        <select\n" +
    "                ng-model=\"match.referee\"\n" +
    "                ng-change=\"changeReferee()\"\n" +
    "                ng-options=\"player as player.nickname for player in match.referee_team.players\">\n" +
    "        </select>\n" +
    "    </label>\n" +
    "\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>"
  );


  $templateCache.put('tournament_registration.html',
    "<div class=\"loader\" ng-hide=\"tournament\"></div>\n" +
    "\n" +
    "<div class=\"row\"><div ng-show=\"tournament\" class=\"columns medium-6 medium-offset-3\">\n" +
    "\n" +
    "    <div ng-cloak class=\"text-center\" ng-hide=\"tournament.registration_open\">\n" +
    "        Přihlašování na turnaj bylo již uzavřeno.\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-cloak class=\"text-center\" ng-hide=\"user.is_authorized\">\n" +
    "        Přihlaš se prosím účtem, který je spárovaný s nějakým hráčem.\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-show=\"tournament.registration_open && user.is_authorized\">\n" +
    "        <h3>{{ tournament.full_name }}</h3>\n" +
    "        <p ng-show=\"error\" class=\"red\">{{ error }}</p>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns medium-6\">\n" +
    "                <label>\n" +
    "                    Tým\n" +
    "                    <select ng-model=\"team\" ng-options=\"team as team.name for team in teams| orderBy:'name'\">\n" +
    "                        <option value=\"\">----</option>\n" +
    "                    </select>\n" +
    "                </label>\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-6\">\n" +
    "                <br>\n" +
    "                <a href=\"#\" data-reveal-id=\"newTeam\">vytvořit nový tým</a>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "        <label>\n" +
    "            Jméno na tomto turnaji (pouze pokud se liší od běžného jména týmu)\n" +
    "            <input type=\"text\" ng-model=\"registration.name\" placeholder=\"{{ team.name }}\">\n" +
    "        </label>\n" +
    "        <label>\n" +
    "            Zkrácené jméno na tomto turnaji (pouze pokud se liší od běžného zkráceného jména týmu)\n" +
    "            <input type=\"text\" ng-model=\"registration.name_short\" placeholder=\"{{ team.name_short }}\">\n" +
    "        </label>\n" +
    "        <label>\n" +
    "            Kontaktní email\n" +
    "            <input type=\"email\" ng-model=\"registration.contact_mail\">\n" +
    "        </label>\n" +
    "        <label>\n" +
    "            Kontaktní telefon\n" +
    "            <input type=\"text\" ng-model=\"registration.contact_phone\">\n" +
    "        </label>\n" +
    "        <label>\n" +
    "            Odhad síly (1 - 4)\n" +
    "            <input type=\"number\" max=\"4\" min=\"1\" ng-model=\"registration.strength\">\n" +
    "        </label>\n" +
    "        <ol style=\"font-size: 0.8em\">\n" +
    "            <li>Budeme na bedně</li>\n" +
    "            <li>Budeme ve finálové skupině (top 8)</li>\n" +
    "            <li>Budeme kolem poloviny</li>\n" +
    "            <li>Přišli jsem si jen zahrát, na nějaké umístění to nevidíme</li>\n" +
    "        </ol>\n" +
    "        <button ng-disabled=\"!registration.team || !registration.contact_mail || !registration.contact_phone || !registration.strength\" ng-click=\"register()\">Přihlásit</button>\n" +
    "    </div>\n" +
    "</div> </div>\n" +
    "\n" +
    "\n" +
    "<div id=\"newTeam\" class=\"small reveal-modal\" data-reveal aria-hidden=\"true\" role=\"dialog\">\n" +
    "    <h2 id=\"modalTitle\">Nový tým</h2>\n" +
    "    <label>\n" +
    "        Jméno\n" +
    "        <input type=\"text\" ng-model=\"newTeam.name\">\n" +
    "    </label>\n" +
    "    <label>\n" +
    "        Zkrácené jméno\n" +
    "        <input type=\"text\" ng-model=\"newTeam.name_short\" placeholder=\"nepovinné, např. (JZM, DIK, DvT, ...)\">\n" +
    "    </label>\n" +
    "    <label>\n" +
    "        Popis (volitelné)\n" +
    "        <textarea name=\"\" id=\"\" cols=\"30\" rows=\"10\" title=\"Popis\" ng-model=\"newTeam.description\"></textarea>\n" +
    "    </label>\n" +
    "    <button ng-hide=\"newTeam.saving\" ng-disabled=\"!newTeam.name\" ng-click=\"addTeam()\">Vytvořit</button>\n" +
    "    <div class=\"loader\" ng-show=\"newTeam.saving\"></div>\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>"
  );


  $templateCache.put('tournament_team.html',
    "<div class=\"loader\" ng-hide=\"team\"></div>\n" +
    "\n" +
    "<div ng-show=\"team\" class=\"row\">\n" +
    "    <a href=\"/turnaj/{{ tournament.pk }}\" class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <h1>{{ tournament.full_name }} - {{ team.name }}</h1>\n" +
    "\n" +
    "    <div class=\"columns medium-6\">\n" +
    "        <h3>Hráči</h3>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"row collapse\">\n" +
    "                <div class=\"small-9 columns\">\n" +
    "                    <select ng-model=\"player\" ng-options=\"player as player.full_name for player in players| orderBy:'full_name'\">\n" +
    "                        <option value=\"\">----</option>\n" +
    "                    </select>\n" +
    "                </div>\n" +
    "                <div class=\"small-3 columns\">\n" +
    "                    <a href=\"#\" ng-click=\"addAttendance()\" ng-disabled=\"!player\" class=\"button postfix\">Přidat</a>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"text-right\"><a href=\"#\" data-reveal-id=\"newPlayer\">Nový hráč</a></div>\n" +
    "\n" +
    "        <ul>\n" +
    "            <li ng-repeat=\"player in team.players | orderBy: 'full_name'\">\n" +
    "                <i class=\"fi-x\" ng-click=\"removeAttendance(player)\"></i>\n" +
    "                <a href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{ player.full_name }}\n" +
    "                </a>\n" +
    "            </li>\n" +
    "        </ul>\n" +
    "\n" +
    "        <hr>\n" +
    "        <h3>Kapitán</h3>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"row collapse\">\n" +
    "                <div class=\"small-9 columns\">\n" +
    "                        <select ng-model=\"team.captain\"\n" +
    "                                ng-change=\"captainMsg = null\"\n" +
    "                                ng-options=\"player as player.full_name for player in team.players| orderBy:'full_name'\">\n" +
    "                            <option value=\"\">----</option>\n" +
    "                        </select>\n" +
    "                </div>\n" +
    "                <div class=\"small-3 columns\">\n" +
    "                    <a href=\"#\" ng-click=\"setCaptain()\" ng-disabled=\"!team.captain\" class=\"button postfix\">Nastavit</a>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <h3>Výchozí brankář</h3>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"row collapse\">\n" +
    "                <div class=\"small-9 columns\">\n" +
    "                        <select ng-model=\"team.defaultGoalie\"\n" +
    "                                ng-change=\"captainMsg = null\"\n" +
    "                                ng-options=\"player as player.full_name for player in team.players| orderBy:'full_name'\">\n" +
    "                            <option value=\"\">----</option>\n" +
    "                        </select>\n" +
    "                </div>\n" +
    "                <div class=\"small-3 columns\">\n" +
    "                    <a href=\"#\" ng-click=\"setDefaultGoalie()\" ng-disabled=\"!team.defaultGoalie\" class=\"button postfix\">Nastavit</a>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "        {{ captainMsg }}\n" +
    "\n" +
    "    </div>\n" +
    "    <div class=\"columns medium-6\">\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div id=\"newPlayer\" class=\"small reveal-modal\" data-reveal>\n" +
    "    Ujisti se prosím, že hráč určitě není v systému.\n" +
    "    <h2 id=\"modalTitle\">Nový hráč</h2>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6\">\n" +
    "            <label>Přezdívka\n" +
    "                <input type=\"text\" ng-model=\"newPlayer.nickname\" placeholder=\"povinné\"/>\n" +
    "            </label>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-6\">\n" +
    "            <label>Pohlaví\n" +
    "                <select\n" +
    "                    ng-model=\"newPlayer.gender\"\n" +
    "                    ng-options=\"gender.id as gender.text for gender in genders\">\n" +
    "                    <option value=\"\">----</option>\n" +
    "                </select>\n" +
    "            </label>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6\">\n" +
    "            <label>Jméno\n" +
    "                <input type=\"text\" ng-model=\"newPlayer.name\" />\n" +
    "            </label>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-6\">\n" +
    "            <label>Příjmení\n" +
    "                <input type=\"text\" ng-model=\"newPlayer.lastname\" />\n" +
    "            </label>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6\">\n" +
    "            <label>Datum narození\n" +
    "                <input type=\"date\" ng-change=\"computeAge()\" ng-model=\"newPlayer.birthdate\">\n" +
    "            </label>\n" +
    "        </div>\n" +
    "         <div class=\"columns small-6\">\n" +
    "            <label>Věk\n" +
    "                <input disabled type=\"text\" ng-model=\"newPlayer.age\" />\n" +
    "            </label>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <i>Datum narození nebude zveřejňováno (pouze jako věk).</i>\n" +
    "\n" +
    "    <br>\n" +
    "\n" +
    "    <button ng-hide=\"newPlayer.saving\" ng-disabled=\"!newPlayer.nickname\" ng-click=\"addPlayer()\">Vytvořit</button>\n" +
    "    <div class=\"loader\" ng-show=\"newPlayer.saving\"></div>\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n"
  );


  $templateCache.put('tournament.html',
    "<div class=\"loader\" ng-hide=\"tournament\"></div>\n" +
    "\n" +
    "<div ng-cloak ng-show=\"tournament\">\n" +
    "    <a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <a class=\"right\" href=\"/skupiny/{{ tournament.pk }}\"><button>Skupiny</button></a>\n" +
    "    <a ng-if=\"tournament.is_tournament_open\" class=\"right\" href=\"/turnaj/{{ tournament.pk }}\" style=\"margin-right: 10px;\"><button>Spravovat</button></a>\n" +
    "    <a ng-if=\"!tournament.closed_edit\" class=\"right\" href=\"/hodnoceni_rozhodcich/{{ tournament.pk }}\" style=\"margin-right: 10px;\"><button>Hodnocení rozhodčích</button></a>\n" +
    "\n" +
    "    <h1>{{ tournament.full_name }}</h1>\n" +
    "\n" +
    "    <ul ng-show=\"goalCount\">\n" +
    "        <li>lokace: {{ tournament.location }}</li>\n" +
    "        <li>kategorie: {{ tournament.category }}</li>\n" +
    "        <li><b>{{ tournament.teamOnTournaments.length }}</b> týmů odehrálo <b>{{ tournament.matches.length }}</b> zápasů</li>\n" +
    "        <li>celkem se zúčastnilo <b>{{ playerCount }}</b> hráčů</li>\n" +
    "        <li>bylo vstřeleno <b>{{ goalCount }}</b> branek</li>\n" +
    "    </ul>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <div class=\"row\"><div class=\"medium-6 column large-4 \" class=\"row\">\n" +
    "        <select\n" +
    "            ng-model=\"filterTeam\"\n" +
    "            ng-options=\"team.name as team.name for team in tournament.teamOnTournaments | orderBy:'name'\">\n" +
    "            <option value=\"\">Všechny týmy</option>\n" +
    "        </select>\n" +
    "    </div></div>\n" +
    "\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns medium-7\">\n" +
    "            <h3>Týmy</h3>\n" +
    "            <table>\n" +
    "                <thead>\n" +
    "                    <tr>\n" +
    "                        <td>#</td>\n" +
    "                        <th>Jméno</th>\n" +
    "                        <th>Skóre</th>\n" +
    "                        <th>Hráči</th>\n" +
    "                    </tr>\n" +
    "                </thead>\n" +
    "                <tbody>\n" +
    "                    <tr ng-repeat=\"t in tournament.teamOnTournaments | filter: { name : filterTeam } | orderBy:'rank'\">\n" +
    "                        <th class=\"text-right\">\n" +
    "                            <span ng-show=\"t.rank\">{{ t.rank }}.</span>\n" +
    "                            <span ng-hide=\"t.rank\">-</span>\n" +
    "                        </th>\n" +
    "                        <td>\n" +
    "                            <a ng-href=\"tym/{{ t.team.pk }}/{{ t.name }}\">{{ t.name}}</a>\n" +
    "                        </td>\n" +
    "                        <td>\n" +
    "                            {{ t.goals_scored }}:{{ t.goals_recieved }}\n" +
    "                        </td>\n" +
    "                        <td>\n" +
    "                            <span ng-repeat=\"player in t.players\">\n" +
    "                                <a ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{ player.nickname }}</a><span ng-hide=\"$last\">, </span>\n" +
    "                            </span>\n" +
    "                        </td>\n" +
    "                    </tr>\n" +
    "                </tbody>\n" +
    "            </table>\n" +
    "\n" +
    "            <h3 ng-show=\"tournament.matches.length > 1\">Zápasy</h3>\n" +
    "            <table style=\"margin: auto\" ng-show=\"tournament.matches.length\">\n" +
    "                <tbody>\n" +
    "                    <tr class=\"hoverLight\" ng-repeat=\"match in tournament.matches | filter: {length: '', search: filterTeam }| orderBy:'start'\">\n" +
    "                            <td class=\"text-right\"> {{ match.team_one.name_pure }}</td>\n" +
    "                            <td class=\"text-right\"><b>{{ match.score_one }}</b></td>\n" +
    "                            <td><b>{{ match.score_two }}<span ng-show=\"match.with_shootout\">P</span></b></td>\n" +
    "                            <td>{{ match.team_two.name_pure }}</td>\n" +
    "                            <td><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\">detail</a></td>\n" +
    "                    </tr>\n" +
    "                </tbody>\n" +
    "            </table>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-5\">\n" +
    "            <label class=\"man\" style=\"float: right !important; margin-left: 10px;\"> <input type=\"checkbox\" ng-change=\"filterPlayers()\" ng-model=\"man\"> </label>\n" +
    "            <label class=\"woman\" style=\"float: right !important;\"> <input type=\"checkbox\" ng-change=\"filterPlayers()\" ng-model=\"woman\"> </label>\n" +
    "            <h3>Nejlepší hráči</h3>\n" +
    "            <div st-rank st-table=\"rows\" st-safe-src=\"players\" ng-cloak ng-show=\"players\">\n" +
    "                <table class=\"smart-table\">\n" +
    "                    <thead>\n" +
    "                    <tr>\n" +
    "                        <th>#</th>\n" +
    "                        <th st-sort=\"nickname\" class=\"clickable\">Jméno</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"goalsSumFiltered\" st-descending-first=\"true\">góly</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"assistsSumFiltered\" st-descending-first=\"true\">asistence</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"canadaFiltered\" st-descending-first=\"true\">kanada</th>\n" +
    "                    </tr>\n" +
    "                    </thead>\n" +
    "                    <tbody>\n" +
    "                    <tr ng-repeat=\"player in rows\">\n" +
    "                        <th>{{ player.rank }}.</th>\n" +
    "                        <td><a ng-class=\"player.gender\" href=\"\" ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{player.nickname}}</a></td>\n" +
    "                        <td class=\"text-right\"> {{ player.goalsSumFiltered }}</td>\n" +
    "                        <td class=\"text-right\">{{ player.assistsSumFiltered }}</td>\n" +
    "                        <td class=\"text-right\">{{ player.canadaFiltered }}</td>\n" +
    "                    </tr>\n" +
    "                    </tbody>\n" +
    "                    <tfoot>\n" +
    "                        <tr>\n" +
    "                            <td colspan=\"5\" class=\"text-center\">\n" +
    "                                <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"5\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                            </td>\n" +
    "                        </tr>\n" +
    "                    </tfoot>\n" +
    "                </table>\n" +
    "            </div>\n" +
    "\n" +
    "            <h3 ng-show=\"goalies\">Nejlepší brankáři</h3>\n" +
    "            <div st-rank st-table=\"rows2\" st-safe-src=\"goalies\" ng-cloak ng-show=\"goalies\">\n" +
    "                <table class=\"smart-table\">\n" +
    "                    <thead>\n" +
    "                    <tr>\n" +
    "                        <th>#</th>\n" +
    "                        <th st-sort=\"player.nickname\" class=\"clickable\">Jméno</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"matches\" st-descending-first=\"true\">zápasů</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"shots\" st-descending-first=\"true\">střel</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"goals\" st-descending-first=\"true\">gólů</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"success\" st-descending-first=\"true\">úspěšnost</th>\n" +
    "                    </tr>\n" +
    "                    </thead>\n" +
    "                    <tbody>\n" +
    "                    <tr ng-repeat=\"goalie in rows2\">\n" +
    "                        <th>{{ goalie.rank }}.</th>\n" +
    "                        <td><a ng-class=\"goalie.player.gender\" href=\"\" ng-href=\"hrac/{{ goalie.player.pk }}/{{ goalie.player.nickname }}\">{{goalie.player.nickname}}</a></td>\n" +
    "                        <td class=\"text-right\"> {{ goalie.matches }}</td>\n" +
    "                        <td class=\"text-right\"> {{ goalie.shots }}</td>\n" +
    "                        <td class=\"text-right\"> {{ goalie.goals }}</td>\n" +
    "                        <td class=\"text-right\"> {{ goalie.success * 100 | number:1 }}%</td>\n" +
    "                    </tr>\n" +
    "                    </tbody>\n" +
    "                    <tfoot>\n" +
    "                        <tr>\n" +
    "                            <td colspan=\"6\" class=\"text-center\">\n" +
    "                                <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"5\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                            </td>\n" +
    "                        </tr>\n" +
    "                    </tfoot>\n" +
    "                </table>\n" +
    "            </div>\n" +
    "\n" +
    "            <h3 ng-show=\"pairs.length\">Nejproduktivnější dvojice</h3>\n" +
    "            <div st-rank st-table=\"rows3\" st-safe-src=\"pairs\" ng-cloak ng-show=\"pairs.length\">\n" +
    "                <table class=\"smart-table\">\n" +
    "                    <thead>\n" +
    "                    <tr>\n" +
    "                        <th>#</th>\n" +
    "                        <th class=\"clickable\">Hráč 1</th>\n" +
    "                        <th class=\"clickable\">Hráč 2</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"points\" st-descending-first=\"true\">body</th>\n" +
    "                    </tr>\n" +
    "                    </thead>\n" +
    "                    <tbody>\n" +
    "                    <tr ng-repeat=\"pair in rows3\">\n" +
    "                        <th>{{ pair.rank }}.</th>\n" +
    "                        <td>\n" +
    "                            <a ng-class=\"pair.player1.gender\" href=\"\" ng-href=\"hrac/{{ pair.player1.pk }}/{{ pair.player1.nickname }}\">\n" +
    "                                {{ pair.player1.nickname }}\n" +
    "                            </a>\n" +
    "                            <span ng-if=\"pair.goals_first\">({{ pair.goals_first }})</span>\n" +
    "                        </td>\n" +
    "                        <td>\n" +
    "                            <a ng-class=\"pair.player2.gender\" href=\"\" ng-href=\"hrac/{{ pair.player2.pk }}/{{ pair.player2.nickname }}\">\n" +
    "                                {{pair.player2.nickname}}\n" +
    "                            </a>\n" +
    "                            <span ng-if=\"pair.goals_second\">({{ pair.goals_second }})</span>\n" +
    "                        </td>\n" +
    "                        <td class=\"text-right\"> {{ pair.points }}</td>\n" +
    "                    </tr>\n" +
    "                    </tbody>\n" +
    "                    <tfoot>\n" +
    "                        <tr>\n" +
    "                            <td colspan=\"6\" class=\"text-center\">\n" +
    "                                <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"5\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                            </td>\n" +
    "                        </tr>\n" +
    "                    </tfoot>\n" +
    "                </table>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n"
  );


  $templateCache.put('tournaments.html',
    "<div class=\"loader\" ng-hide=\"tournaments\"></div>\n" +
    "\n" +
    "<div st-persist=\"tournaments\" st-table=\"rows\" st-safe-src=\"tournaments\" ng-cloak ng-show=\"tournaments\">\n" +
    "    <table class=\"smart-table\">\n" +
    "        <thead>\n" +
    "        <tr>\n" +
    "            <th width=\"30%\" st-sort=\"name\">Jméno</th>\n" +
    "            <th width=\"20%\" st-sort=\"date\">Datum</th>\n" +
    "            <th width=\"10%\">Týmů</th>\n" +
    "            <th width=\"10%\">Lokace</th>\n" +
    "            <th width=\"10%\">Kategorie</th>\n" +
    "        </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "        <tr ng-repeat=\"tournament in rows\">\n" +
    "            <td><a ng-href=\"/turnaj/{{ tournament.pk }}/{{ tournament.full_name }}\">{{ tournament.full_name }}</a></td>\n" +
    "            <td>{{ tournament.date }}</td>\n" +
    "            <td>{{ tournament.teamOnTournaments.length }}</td>\n" +
    "            <td>{{ tournament.location }}</td>\n" +
    "            <td>{{ tournament.category }}</td>\n" +
    "        </tr>\n" +
    "        </tbody>\n" +
    "        <tfoot>\n" +
    "            <tr>\n" +
    "                <td colspan=\"5\" class=\"text-center\">\n" +
    "                    <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"10\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tfoot>\n" +
    "    </table>\n" +
    "</div>\n"
  );


  $templateCache.put('utils/st-pagination.html',
    "<nav ng-if=\"pages.length >= 2\">\n" +
    "    <div class=\"pagination-centered\">\n" +
    "        <ul class=\"pagination\">\n" +
    "            <li class=\"arrow\" ng-class=\"{unavailable : currentPage == 1}\"><a ng-click=\"selectPage(1)\">&laquo;</a></li>\n" +
    "            <li class=\"arrow\" ng-class=\"{unavailable : currentPage == 1}\"><a ng-click=\"selectPage(currentPage - 1)\">&lsaquo;</a></li>\n" +
    "            <li ng-repeat=\"page in pages\" ng-class=\"{current: page==currentPage}\"><a ng-click=\"selectPage(page)\">{{page}}</a> </li>\n" +
    "            <li class=\"arrow\" ng-class=\"{unavailable : currentPage == numPages}\"><a ng-click=\"selectPage(currentPage + 1)\">&rsaquo;</a></li>\n" +
    "            <li class=\"arrow\" ng-class=\"{unavailable : currentPage == numPages}\"><a ng-click=\"selectPage(numPages)\">&raquo;</a></li>\n" +
    "        </ul>\n" +
    "    </div>\n" +
    "</nav>"
  );

}]);
