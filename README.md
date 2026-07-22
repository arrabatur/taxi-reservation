# Voliuz Transport — Réservation de chauffeur taxi

Site statique (HTML/CSS/JS pur, aucun build) déployable sur **GitHub Pages**, avec :

- Une **landing page** présentant le service.
- Une **page réservation** avec connexion par **magic link** (email, sans mot de passe),
  choix du **chauffeur** et de la **date**, puis sélection des **agréments** proposés par
  ce chauffeur pour le trajet (Wi-Fi, siège enfant, animaux acceptés...).

Le backend (authentification + base de données) est géré par **[Supabase](https://supabase.com)**
(offre gratuite largement suffisante), car GitHub Pages ne peut héberger que du contenu statique.

## Structure du projet

```
index.html            Landing page
reservation.html       Page de réservation (auth + choix chauffeur/date/agréments)
css/style.css          Styles (thème taxi noir/jaune, responsive)
js/config.js           Clés Supabase (URL + clé publique "anon")
js/supabaseClient.js   Initialisation du client Supabase
js/auth.js             Envoi du magic link, gestion de session
js/reservation.js      Logique de la page réservation
supabase/schema.sql    Tables + Row Level Security
supabase/seed.sql      Chauffeurs et agréments de démonstration
.github/workflows/deploy.yml  Déploiement automatique sur GitHub Pages
```

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project** (gratuit).
2. Une fois le projet créé, ouvre **SQL Editor** et exécute dans l'ordre :
   - le contenu de [`supabase/schema.sql`](supabase/schema.sql) (tables + RLS)
   - le contenu de [`supabase/seed.sql`](supabase/seed.sql) (chauffeurs et agréments de démo)
3. Va dans **Authentication → Sign In / Providers → Email** :
   - active **"Email OTP" / magic link** (activé par défaut sur un nouveau projet).
   - tu peux personnaliser le template d'email dans **Authentication → Emails**.
4. Va dans **Authentication → URL Configuration** et renseigne :
   - **Site URL** : `https://TON-USER.github.io/TON-DEPOT/`
   - **Redirect URLs** : ajoute `https://TON-USER.github.io/TON-DEPOT/reservation.html`
   (à faire une fois que ton site est déployé — voir étape 3).
5. Récupère tes clés dans **Project Settings → API** :
   - `Project URL`
   - `anon public` key

## 2. Configurer le projet

Ouvre [`js/config.js`](js/config.js) et remplace les deux valeurs :

```js
export const SUPABASE_URL = "https://TON-PROJET.supabase.co";
export const SUPABASE_ANON_KEY = "TA-CLE-ANON-PUBLIQUE";
```

> La clé `anon` est publique par conception : elle est protégée par les règles RLS
> définies dans `schema.sql` (chaque utilisateur ne voit que ses propres réservations).
> Elle peut donc être commitée sans risque, y compris dans un dépôt public.

## 3. Déployer sur GitHub Pages

```bash
cd taxi-reservation
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON-USER/TON-DEPOT.git
git push -u origin main
```

Puis sur GitHub :

1. **Settings → Pages → Build and deployment → Source** : sélectionne **GitHub Actions**.
2. Le workflow [`deploy.yml`](.github/workflows/deploy.yml) se déclenche automatiquement à
   chaque push sur `main` et publie le site.
3. Ton site sera disponible à `https://TON-USER.github.io/TON-DEPOT/`.
4. Retourne dans Supabase (étape 1.4) pour renseigner cette URL réelle dans
   **Site URL** / **Redirect URLs**, sinon le clic sur le magic link ne redirigera pas correctement.

## 4. Tester en local

Comme les pages utilisent des modules ES (`type="module"`), ouvrir les fichiers HTML
directement (`file://`) ne fonctionnera pas pour les imports. Sers le dossier via un
petit serveur local, par exemple :

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Puis ouvre `http://localhost:8080`.

## Personnalisation

- **Chauffeurs / agréments** : modifie directement les tables `drivers`, `amenities` et
  `driver_amenities` dans Supabase (Table Editor), pas besoin de redéployer le site.
- **Tarifs** : `base_price_cents` sur `drivers`, `extra_price_cents` sur `driver_amenities`.
- **Design** : tout le style est centralisé dans [`css/style.css`](css/style.css).
- **Statut des réservations** : la colonne `status` de `reservations` (par défaut
  `pending`) peut être utilisée pour construire un espace chauffeur/admin de confirmation.
