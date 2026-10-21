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
- Iedere poging wordt **eerst definitief geregistreerd** voordat Firebase de geheime antwoordsleutel gebruikt voor de winnaarcontrole. Zo kan een speler niet via geweigerde transacties onbeperkt A/B/C/D proberen. Mocht het toestel tijdens de winnaarcontrole worden afgesloten, dan probeert de app bij opnieuw openen de opgeslagen poging alsnog te laten nakijken.
- De eerste correcte poging wint 20% korting op de eerstvolgende door die speler zelf toegevoegde donut. De reservering in `quizPrizes/{id}` wordt in een Firestore-transactie gemaakt samen met het sluiten van de ronde en het opschuiven van de gedeelde staat. Twee winnaars in dezelfde ronde zijn daardoor niet mogelijk.
- Het verzilveren van de prijs gebeurt met een atomaire write naar de nieuwe donut en de corresponderende prize-document. Een tweede verzilvering wordt geweigerd door de beveiligingsregels. Een onbenutte quizkorting verloopt niet op 3 november; de vraagplanning loopt tot die datum.
- Bij meerdere kortingen geldt voor de betreffende donut de hoogste korting: 20%-quizprijs, een tijdelijke actie, verjaardagsweek of de gewone/persoonlijke staffel; geen stapeling.
- **De antwoordcodes staan NIET in de publieke GitHub-code.** Na het publiceren van de bijbehorende Firestore Rules logt de geverifieerde admin in en plakt éénmaal de privé antwoordcode van 25 letters in het op de site zichtbare activatieveld. De keys worden als admin-only creation naar `quizAnswers` weggeschreven, waarvoor `allow read: if false` geldt. Kopieer het volledige privécodeblok NOOIT naar een openbaar repositorybestand.
- **Vereist:** publiceer de bijbehorende `firestore.rules` in Firebase Console → Firestore Database → Rules → Publish, vóór de activering. Er zijn geen Firebase Cloud Functions of Blaze-abonnement nodig. Firestore-rules gebruiken server-side `getAfter()` om gelijktijdige transacties af te dwingen.

## Pushmeldingen bij nieuwe quizvragen (Android/iOS PWA)

Dit is **echte Web Push** (Push API), niet een notificatie die alleen werkt zolang de pagina openstaat. De installatie als PWA blijft hetzelfde. Spelers geven vanuit hun ingelogde account via **🔕 Quizmeldingen aanzetten** expliciet toestemming. Na toestemming worden hun push-endpoint en encryptiesleutels opgeslagen in de beveiligde Firestore-collectie `pushDevices`; andere spelers mogen deze niet lezen. De speler kan meldingen met dezelfde knop uitschakelen.

**Eenmalige beheerinstelling vereist; anders worden geen meldingen verstuurd:**

1. Publiceer `firestore.rules` in Firebase Console > Firestore Database > Rules > **Publish**.
2. Maak in Google Cloud voor project `donutpot-b1863` een *apart, minimaal bevoegd* service account aan met de rol **Cloud Datastore User** (`roles/datastore.user`). Maak een JSON-sleutel voor dat account. Plaats het complete JSON-bestand als secret in de GitHub-repository: **Settings > Secrets and variables > Actions > New repository secret**, naam `FIREBASE_SERVICE_ACCOUNT_JSON`. Plaats deze sleutel NOOIT in Git of een chat.
3. Plaats de bij DONUT OPS aangemaakte Web Push **PRIVATE** VAPID-key (alleen de waarde, zonder `WEB_PUSH_PRIVATE_KEY=`) als tweede GitHub Actions secret, met naam `WEB_PUSH_PRIVATE_KEY`. De bijbehorende *openbare* VAPID-key staat in `push-client.js` en `scripts/send-quiz-push.cjs`.
4. GitHub Actions moet toegestaan zijn. Bekijk **Actions > DONUT OPS Quizmeldingen** en start één keer handmatig via **Run workflow** om te controleren dat de secrets correct staan. De Action controleert vervolgens elke 5 minuten automatisch op een nieuwe beschikbare quizvraag.

**Werking:** de sender controleert `quizState/main`, de huidige ronde, de geplande starttijd en of de ronde nog geen winnaar heeft. De server verstuurt per ronde maximaal één aankondiging naar alle toestellen die zich hebben aangemeld en houdt `quizAnnouncements/{roundId}` bij tegen dubbelen. De serviceworker toont de melding, ook wanneer de PWA gesloten is, en openen leidt naar de quizkaart. De server heeft geen toegang tot antwoordcorrectheid nodig.

**Beperkingen:** GitHub Actions start op zijn vroegst om de vijf minuten en kan vertraging hebben; de melding is dus niet exact op de seconde. Wordt een vraag binnen die tijd beantwoord, dan wordt geen achterhaalde melding gestuurd. Alleen toestemming gevende toestellen ontvangen push, en op iOS is een geïnstalleerde beginscherm-PWA met iOS 16.4+ vereist. Er worden geen pushmeldingen meer verstuurd na 3 november 2026; bestaande quizvragen op de site blijven bereikbaar.

## Juiste totale potwaarde en betalingen na korting

- De dashboard-cijfers zijn **Betaald gemeld**, **Openstaand bij squad** en **Totaal na korting**. Het totaal is de som van netto als betaald geregistreerde bedragen + netto nog openstaande schulden; niet simpelweg donutcount × €1.
- Bij bevestiging van een geslaagde Tikkie-betaling wordt voor iedere openstaande donut in één batch `paid=true`, `paidCents` (werkelijke netto centen volgens de app op dat moment), `paidDiscountPct` en `paidAt` opgeslagen. Deze bedragen veranderen **niet achteraf** bij het verlopen van een actie of een nieuwe staffelkorting.
- Een gewonnen quizkorting wordt slechts op de daarmee gekoppelde volgende donut toegepast; bij het aflossen wordt ook dit netto bedrag vastgelegd. Nooit korting stapelen: het hoogste percentage geldt.
- Bestaande als betaald gemarkeerde donuts van vóór deze wijziging missen een betaald bedrag. De app toont hiervoor expliciet een waarschuwing en rekent voorlopig €1 per stuk. Het historische echte Tikkie-bedrag is niet met zekerheid terug te halen uit alleen `paid=true`; corrigeer deze historische geldbedragen niet stilzwijgend.
- Gebruikers blijven zelf verantwoordelijk voor het correct invullen van het bedrag bij Tikkie en het pas na succesvolle betaling bevestigen. DONUT OPS kan Tikkie-betalingen niet automatisch verifiëren.
- **Vereist:** de gewijzigde `firestore.rules` opnieuw publiceren in Firebase Console, anders kan de app het nettobedrag bij nieuw bevestigde betalingen niet bewaren.

## Toestelondersteuning bij notificaties (Samsung / Chrome / iOS)

- De knop **Quizmeldingen aanzetten** is na inloggen voor elk account zichtbaar. Op niet-ondersteunde toestellen blijft hij aanklikbaar en geeft uitleg over de ontbrekende browserfuncties, in plaats van stilzwijgend uitgeschakeld te worden.
- Samsung Internet ondersteunt Web Push in principe, maar ondersteuning verschilt per browser-/PWA-versie en Android-instellingen. Als het niet lukt, installeer DONUT OPS via de nieuwste **Google Chrome voor Android** en geef notificatierechten aan zowel de site als de browser/PWA.
- Android: controleer zowel de site-instelling voor meldingen als **Instellingen → Apps → Meldingen** van de relevante browser of PWA; eerdere weigeringen moeten via de systeem- of website-instellingen worden opgeheven.
- iOS: push kan alleen vanaf **iOS 16.4** met een **aan het beginscherm toegevoegde webapp**, niet vanuit een gewoon Safari-tabblad. Zet meldingen aan via de geïnstalleerde app.
- Als de serviceworker nog installeert of bijwerkt, wacht de abonnementsregistratie nu op `navigator.serviceWorker.ready`.
- De nieuwe serviceworker `donutops-pwa-v9` haalt `push-client.js` bij online gebruik netwerk-eerst op, zodat toestellen de compatibiliteitsfix ontvangen zonder herinstallatie.
- Dit is een verbetering van de foutmelding en registratie, **geen** garantie dat de besturingssystemen daadwerkelijke push bezorgen. Test toestemming en bezorging per browser/toestel.

## Get Ready + willekeurige ochtend-/avondplanning (21 oktober 2026)

- **25 quizvragen, uiterlijk gepland t/m 3 november**. Bij (nieuwe) activering worden de vraagmomenten willekeurig gekozen binnen uitsluitend **08:30–12:00** en **19:00–22:00, tijdzone Europe/Amsterdam**. Overgang naar wintertijd (25 oktober 2026) wordt automatisch opgevangen.
- Iedere vraag heeft voor alle spelers dezelfde centraal in Firestore opgeslagen vrijgavetijd. Bij een beschikbaar venster krijgt iedere ronde bij voorkeur een apart dagdeel. Als er door latere activering te weinig dagdelen overblijven, kunnen meerdere vragen in hetzelfde venster vallen.
- Vanaf **30 minuten vóór** de geplande start ziet iedere ingelogde speler in de quizkaart **🎮 GET READY**, met een live aftelling die iedere 15 seconden ververst. Daarvoor toont DONUT OPS de twee toegestane tijdvensters zonder het verrassingsmoment weg te geven.
- De bestaande GitHub Action verstuurt optioneel een **Get Ready-webpush** zodra de huidige gedeelde vraag binnen 30 minuten gaat openen en, apart daarvan, de bestaande **Nieuwe quizvraag**-webpush op of na de start. GitHub draait om de vijf minuten; push kan dus later komen en bezorging is niet gegarandeerd. Iedere fase heeft een aparte Firestore-verzendregistratie in `quizAnnouncements` om dubbelen tegen te gaan.
- **Bestaande, al geactiveerde quiz:** `scripts/migrate-quiz-schedule.cjs` plant automatisch eenmalig de nog niet geopende rondes opnieuw in bij de eerstvolgende GitHub Action. Vragen die al openstaan en alle reeds gespeelde vragen, pogingen, winnaars en kortingsbonnen blijven ongewijzigd. Eén server-side marker `quizSchedule/windows-2026-v1` verhindert herhaald herschikken. Er is geen nieuwe Firestore Rules-publicatie nodig; de server gebruikt de bestaande serviceaccountrechten.
- **Voorrang van eerdere vragen:** vraag N+1 verschijnt pas wanneer vraag N goed is beantwoord én het eigen geplande moment is bereikt. Als een vraag onopgelost blijft kunnen latere vragen later worden geopend (desnoods na 3 november). De planning is dan een richtschema, geen gegarandeerde voltooide cyclus.
