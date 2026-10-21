# DONUT OPS — GitHub Pages + Firebase

Site: https://robertjan83.github.io/donutpot/

## Firebase handmatig afronden

1. Firebase Console → Build → Authentication → Sign-in method → **Email/Password** inschakelen.
2. Authentication → Settings → Authorized domains → **robertjan83.github.io** toevoegen.
3. Firestore Database → database aanmaken (**Production mode**, Europese regio).
4. Firestore Database → **Rules** → plak **volledige inhoud** van `firestore.rules` en klik **Publish**.
5. GitHub repo → Settings → Pages → Deploy from a branch → main /(root).
6. Open site, wachtwoord `donutpot`, vervolgens speler registreren met e-mail, eigen wachtwoord en gamertag.

## Werking

- Iedere speler maakt een eigen Firebase Authentication-account.
- Alle ingelogde spelers kunnen elkaars score en openstaande bedragen bekijken.
- Alleen de eigenaar kan zijn eigen donut toevoegen of van openstaand naar betaald veranderen.
- Betalen via Tikkie is extern en wordt **niet** automatisch bevestigd. Markeer donuts als betaald **nadat** de Tikkie-betaling daadwerkelijk gelukt is.
- Tikkie-link geldig t/m 2 november 2026: https://tikkie.me/pay/oa4fpbpd0nuk4ap8ec90 ; laat de speler het **berekende bedrag na korting** invullen, als Tikkie een vrij bedrag toestaat. De website vult het Tikkie-bedrag niet automatisch in.
- Korting wordt per speler berekend over **alle nog openstaande** donuts: 1 t/m 4 = 0%, 5 t/m 9 = 10%, vanaf 10 = 15%. Voorbeelden: 5 donuts € 4,50, 6 donuts € 5,40, 10 donuts € 8,50, 11 donuts € 9,35. De groepsschuld is de som van de afzonderlijke netto schulden.
- Na bevestiging van een geslaagde betaling markeert de app de openstaande donuts als betaald. De openstaande schuld en kortingsteller beginnen daarna opnieuw vanaf nul; de historische donut-ranglijst blijft behouden.
- `donutpot` is slechts een publieke client-side toegangspoort, geen sterke beveiliging. De echte bescherming gebeurt door Firebase Auth en Firestore-rules.
- Firebase-config bevat publieke webinstellingen, geen service-account credentials.

## Belangrijke beperking

Elke ingelogde gebruiker kan elke andere speler zien en zelf zijn eigen openstaande donuts als betaald markeren. Er is geen onafhankelijke Tikkie-bevestiging, betaaltransactie-verificatie of admin-approval.

## Mini Admin Dashboard (v1)

- Login met geverifieerd Firebase Authentication-account **rjpeetoom@gmail.com**. Andere spelers krijgen geen adminpaneel.
- **Belangrijk**: publiceer de volledige inhoud van `firestore.rules` in Firebase Console → Firestore Database → Rules → **Publish**. GitHub Pages publiceert Firestore-regels NIET.
- Indien je e-mailadres nog niet geverifieerd is, gebruik **Admin activeren** om de verificatiemail te verzenden en klik daarna op **Ik heb mijn mail bevestigd**.
- Via **⚙️ Admin** kan je per speler **+1** (een nieuwe openstaande donut) en **−1** (de nieuwste onbetaalde donut annuleren; anders de nieuwste betaalde) corrigeren.
- Een gecorrigeerde donut blijft voor controle in Firestore staan met `voided=true`, `voidedBy` en `voidedAt`, maar telt niet meer mee voor totalen, schuld, korting of recente donuts.
- Persoonlijke korting: stel per gebruiker `minDonuts` (1 t/m 999) en `percent` (0 t/m 100) in. Vanaf die hoeveelheid **openstaande** donuts overschrijft dit percentage de standaardkorting, ook als het lager is. Daaronder blijft de standaardstaffel gelden.
- Klik **Standaard** om de persoonlijke korting volledig te verwijderen (standaardstaffel 5–9: 10%, vanaf 10: 15%).
- Deze wijzigingen veranderen automatisch de schuld, squad-totalen, ranglijstbedragen en het bedrag dat bij Tikkie getoond wordt. Tikkie zelf leest deze bedragen niet automatisch.
- Adminacties zijn beschermd door server-side Firestore-regels met **exact e-mailadres + geverifieerde e-mailclaim**; wijziging van de knop in de browser verleent geen privileges.

## Tijdelijke acties en verjaardagskorting

- Via de verified-email admin (`rjpeetoom@gmail.com`) kun je per speler een **tijdelijke actie vanaf nu** starten: 1–365 dagen, 1–999 donuts, 0–100% korting. Bijvoorbeeld 3 donuts gedurende 2 dagen met 30% korting.
- De korting geldt voor de **eerste X in die periode geregistreerde donuts**. Betaalde donuts tellen voor de actielimiet mee, foutief geregistreerde/gecorrigeerde donuts niet.
- De actieperiodes zijn onveranderlijk vastgelegd in een aparte `offers`-collectie. **Na het verstrijken van de eindtijd vervalt de actiekorting altijd**, ongeacht of de limiet is bereikt. Nog openstaande donuts worden vanaf dat moment opnieuw tegen de normale/persoonlijke staffel berekend. Al eerder betaalde donuts blijven betaald.
- Admin kan per speler een verjaardag (uitsluitend dag en maand) opslaan. **20% korting** op alle donuts geregistreerd in de verjaardagsweek, van maandag 00:00 t/m zondag 23:59 in **Europe/Amsterdam**. In niet-schrikkeljaren valt een verjaardag op 29 februari in de week van 28 februari.
- Korting wordt **per donut** bepaald. De bestaande standaardstaffel (5–9 open = 10%, 10+ open = 15%) of oude persoonlijke staffel geldt als basis voor alle openstaande donuts. De verjaardags- of actiepercentages kunnen de korting op betreffende donuts verhogen: het **hoogste percentage** geldt, nooit stapeling. De getoonde schuld en groepsschuld zijn netto.
- De Tikkie-link vult de prijs niet zelf in. De speler betaalt het berekende bedrag en markeert na geslaagde betaling zelf zijn openstaande donuts als betaald.
- De prijs wordt bepaald door de registratiedatum én of de actie **nu** nog loopt. Zodra de actie eindigt, vervalt de korting op alle nog onbetaalde donuts, ook als ze tijdens de actie zijn geregistreerd. De verjaardagskorting geldt eveneens uitsluitend tijdens de verjaardagsweek. De site herberekent de schuld iedere 30 seconden en wanneer de browser/PWA weer in beeld komt.
- **Firestore Rules publiceren is verplicht** na deze update: de bijgewerkte `firestore.rules` staan in GitHub; kopieer naar Firebase Console → Firestore Database → Rules → Publish. Zonder deze stap kan het dashboard geen verjaardagen/acties bewaren en kan de app de nieuwe `offers`-collectie niet uitlezen.

## DONUT OPS Quiz Challenge – 25 vragen, t/m 3 november 2026

- De app toont een in-page quizkaart (geen popup). 25 vragen worden na activering willekeurig ingepland tot en met 3 november 2026. De planning is één keer centraal vastgelegd in `quizRounds`.
- Eén gezamenlijke actieve ronde: `quizState/main` is de gezaghebbende rondeaanwijzer. Volgende rondes gaan pas open wanneer een eerdere vraag door de eerste correcte speler is opgelost EN hun geplande starttijd is bereikt. Een onbeantwoorde vraag blijft openstaan.
- Iedereen krijgt precies dezelfde vier antwoorden; elke speler mag per vraag eenmaal gokken. Foute pogingen zijn onveranderlijk opgeslagen onder `quizRounds/{id}/attempts/{uid}`.
- De eerste correcte poging wint 20% korting op de eerstvolgende door die speler zelf toegevoegde donut. De reservering in `quizPrizes/{id}` wordt in een Firestore-transactie gemaakt samen met het sluiten van de ronde en het opschuiven van de gedeelde staat. Twee winnaars in dezelfde ronde zijn daardoor niet mogelijk.
- Het verzilveren van de prijs gebeurt met een atomaire write naar de nieuwe donut en de corresponderende prize-document. Een tweede verzilvering wordt geweigerd door de beveiligingsregels. Een onbenutte quizkorting verloopt niet op 3 november; de vraagplanning loopt tot die datum.
- Bij meerdere kortingen geldt voor de betreffende donut de hoogste korting: 20%-quizprijs, een tijdelijke actie, verjaardagsweek of de gewone/persoonlijke staffel; geen stapeling.
- **De antwoordcodes staan NIET in de publieke GitHub-code.** Na het publiceren van de bijbehorende Firestore Rules logt de geverifieerde admin in en plakt éénmaal de privé antwoordcode van 25 letters in het op de site zichtbare activatieveld. De keys worden als admin-only creation naar `quizAnswers` weggeschreven, waarvoor `allow read: if false` geldt. Kopieer het volledige privécodeblok NOOIT naar een openbaar repositorybestand.
- **Vereist:** publiceer de bijbehorende `firestore.rules` in Firebase Console → Firestore Database → Rules → Publish, vóór de activering. Er zijn geen Firebase Cloud Functions of Blaze-abonnement nodig. Firestore-rules gebruiken server-side `getAfter()` om gelijktijdige transacties af te dwingen.
