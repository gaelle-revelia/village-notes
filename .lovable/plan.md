

# The Village — Plan d'implémentation

## Vue d'ensemble
Application mobile-first pour parents d'enfants en situation de handicap. Le parent enregistre un mémo vocal après une séance, l'app transcrit et structure automatiquement une note organisée dans une timeline chronologique.

**Principe UX central :** Zéro friction, zéro culpabilisation. Chaque interaction est immédiate, claire et bienveillante.

---

## Phase 1 — Fondations & Authentification

### Design System
- Mise en place des couleurs (bleu ardoise, beige sable, gris chaud…), typographies (Crimson Text pour les titres, Inter pour le corps), et composants de base (boutons, cards, tags rectangulaires, formulaires, FAB)
- Layout mobile-first (375px), grille d'espacement 8px, border-radius 12px standard

### Authentification (Écran 1)
- **Inscription** : email + mot de passe + consentement → création compte Supabase Auth → écran d'attente confirmation email → redirection onboarding
- **Connexion** : email + mot de passe → redirection timeline (ou onboarding si profil incomplet), session persistante
- **Mot de passe oublié** : envoi lien de reset par email
- Tous les états d'erreur et messages en français, ton bienveillant

### Base de données & sécurité
- Tables : `enfants`, `intervenants`, `memos`, `nsm_scores`
- RLS sur toutes les tables (chaque utilisateur n'accède qu'à ses données)
- Index full-text français sur les mémos

---

## Phase 2 — Onboarding (Écran 2)

Séquence en 4 étapes avec barre de progression :
1. **Votre enfant** (obligatoire) — prénom, date de naissance, diagnostic (texte libre)
2. **Votre village** (optionnel) — ajout des intervenants (nom + spécialité)
3. **Score de clarté NSM J0** — slider 0-10, sauvegardé dans `nsm_scores`
4. **Prêt** — confirmation + CTA vers premier mémo

---

## Phase 3 — Enregistrement de mémo vocal (Écran 3)

C'est le cœur de l'app, accessible en 1 tap depuis n'importe où via le FAB.

### Enregistrement audio
- Grand bouton microphone centré → enregistrement immédiat
- Animation pulsation rouge, compteur mm:ss, waveform animée
- Limite 10 minutes avec avertissement à 9 min
- Gestion permission micro refusée → fallback saisie texte

### Pipeline de traitement (Edge Functions)
- **Étape 1 — Upload** : envoi audio vers Supabase Storage (bucket temporaire)
- **Étape 2 — Transcription** : appel Whisper API via Edge Function, 2 retries automatiques
- **Étape 3 — Structuration** : appel LLM (Lovable AI) via Edge Function avec prompt guardrailé (jamais de diagnostic, uniquement organisation des observations du parent)
- Suppression audio immédiate après transcription confirmée
- Progression visuelle en 3 étapes avec états d'erreur gracieux

### Note générée
- Affichage structuré : résumé, détails à retenir, suggestions, tags colorés par domaine
- Association intervenant (détection auto ou sélection manuelle)
- Bouton "C'est bon" → retour timeline

### Mode saisie texte (fallback)
- Zone de texte libre → envoi direct au LLM pour structuration (sans Whisper)

---

## Phase 4 — Timeline (Écran 4)

### Timeline principale
- Liste chronologique inversée avec MemoCards (date, intervenant, résumé tronqué, tags)
- Pagination par scroll infini (20 mémos par chargement)
- Skeleton cards pendant le chargement
- État vide chaleureux après onboarding
- FAB microphone toujours visible

### Recherche
- Recherche full-text française (index GIN PostgreSQL)
- Résultats en temps réel (debounce 300ms), termes surlignés
- Recherche sur transcription + contenu structuré + tags + intervenants

### Note complète
- Vue détaillée d'un mémo : en-tête (date, intervenant, spécialité) + corps structuré complet
- Conservation de la position de scroll au retour

---

## Phase 5 (ultérieure) — Fonctionnalités Premium

Ces fonctionnalités sont documentées dans le PRD mais seront implémentées après le MVP :
- **Édition de notes** (Écran 3.5)
- **Filtres avancés** sur la timeline (par intervenant, domaine, période)
- **Paramètres & Profil** (Écran 5) — gestion enfant, intervenants, compte, export données, suppression compte
- **Abonnement Premium** (Écran 6) — limite 10 mémos/mois en gratuit, Stripe Checkout pour 9,99€/mois
- **Upload PDF** — ajout de comptes rendus médicaux avec extraction texte et structuration

