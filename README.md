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
