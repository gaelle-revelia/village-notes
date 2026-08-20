# Plan de mise à jour du code d'accès partenaire

## Objectif
Remplacer le code d'accès partenaire actuel `VILLAGE-ILDYS-26` par `VILLAGE-CHU-26` dans le secret `ACCESS_CODE_PARTNERS` utilisé par l'Edge Function `verify-access-code`.

## Étapes
1. **Mettre à jour le secret** `ACCESS_CODE_PARTNERS` avec la valeur `VILLAGE-CHU-26` via l'outil de gestion des secrets.
2. **Confirmer la mise à jour** sans exposer la valeur (rapport uniquement sur le nom du secret modifié).

## Impact
- La Edge Function `verify-access-code` validera immédiatement le nouveau code.
- Aucune modification de code n'est nécessaire (la comparaison utilise le secret).
- Les anciens codes deviennent invalides dès la mise à jour.
