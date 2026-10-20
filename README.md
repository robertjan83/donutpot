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
- Tikkie-link geldig t/m 2 november 2026: https://tikkie.me/pay/oa4fpbpd0nuk4ap8ec90 ; controleer bij meerdere donuts dat het ingevoerde betaalbedrag overeenkomt met €1 per openstaande donut.
- `donutpot` is slechts een publieke client-side toegangspoort, geen sterke beveiliging. De echte bescherming gebeurt door Firebase Auth en Firestore-rules.
- Firebase-config bevat publieke webinstellingen, geen service-account credentials.

## Belangrijke beperking

Elke ingelogde gebruiker kan elke andere speler zien en zelf zijn eigen openstaande donuts als betaald markeren. Er is geen onafhankelijke Tikkie-bevestiging, betaaltransactie-verificatie of admin-approval.
