# Réparer "Retirer du village" pour les professionnels

## Constat (vérifié)
- Le bouton "Retirer du village" ouvre une confirmation, puis passe le membre en "archivé" (il n'est jamais supprimé, conformément aux règles).
- Les droits côté base sont corrects : propriétaire et coparent peuvent archiver.
- En cas d'échec, l'app n'affiche aucun message : rien ne se passe, sans explication.
- La cause exacte n'est pas encore confirmée (fenêtre de confirmation masquée par le panneau, ou enregistrement refusé).

## Étapes
1. Reproduire sur mobile (taille de votre écran) : ouvrir un professionnel, cliquer "Retirer du village", confirmer, et observer l'écran et la réponse du serveur.
2. Corriger la cause trouvée :
   - si la confirmation est cachée ou fermée trop tôt par le panneau : l'afficher au premier plan et fermer le panneau seulement après confirmation ;
   - si l'enregistrement échoue : corriger la cause précise.
3. Afficher un message clair si le retrait échoue ("Le membre n'a pas pu être retiré, réessayez"), et une confirmation quand il réussit.
4. Revérifier le parcours complet : le professionnel disparaît de Mon Village et des sélecteurs, ses mémos restent dans la timeline.

## Détails techniques
- Fichiers : `src/pages/VillageSettings.tsx` (handleDelete sans gestion d'erreur), `src/components/village/MemberDetailPanel.tsx` (onDelete + close() simultanés, z-index du panneau vs AlertDialog).
- Toujours `update({ actif: false })`, jamais de DELETE.
