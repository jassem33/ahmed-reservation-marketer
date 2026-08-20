#!/bin/sh
# Surveillance horaire de l'hôte. Installer :
#   cp deploy/health-check.sh /usr/local/bin/ahmedmarketer-health.sh && chmod +x …
#   cron : 17 * * * * /usr/local/bin/ahmedmarketer-health.sh
#
# Écrit son diagnostic dans settings['health'], que le bandeau d'alerte de
# l'administration affiche (components/HealthBanner.tsx). Aucun SMTP n'étant
# configuré sur ce serveur, c'est le seul canal qui atteint vraiment quelqu'un :
# le 2026-08-20 le disque s'est rempli en silence et le site est tombé.
set -e
DIR=/var/backups/ahmedmarketer
LOG=/var/log/ahmedmarketer-health.log
DISK_WARN_PCT=80
BACKUP_MAX_AGE_H=30

cd /root/ahmedmarketer || exit 1

PCT=$(df -P / | awk 'NR==2 {print $5}' | tr -d '%')
FREE_GB=$(df -PBG / | awk 'NR==2 {print $4}' | tr -d 'G')

PROBLEMS=''
add() { PROBLEMS="$PROBLEMS$1
"; }

[ "$PCT" -ge "$DISK_WARN_PCT" ] &&
  add "Disque à ${PCT} % (${FREE_GB} Go libres) — au-delà de ${DISK_WARN_PCT} % le risque de panne devient réel."

# Fraîcheur de la dernière sauvegarde.
LAST=$(ls -1t "$DIR"/db-*.dump 2>/dev/null | head -1)
if [ -z "$LAST" ]; then
  AGE_H=null
  SIZE=''
  add 'Aucune sauvegarde de base de données trouvée.'
else
  AGE_H=$(( ($(date +%s) - $(stat -c %Y "$LAST")) / 3600 ))
  SIZE=$(du -h "$LAST" | cut -f1)
  [ "$AGE_H" -gt "$BACKUP_MAX_AGE_H" ] &&
    add "Dernière sauvegarde il y a ${AGE_H} h (${LAST##*/}) — la sauvegarde quotidienne ne passe plus."
fi

# Miroir des médias : une sauvegarde de base sans les fichiers est incomplète.
VOL=/var/lib/docker/volumes/ahmedmarketer_media-data/_data
if [ -d "$VOL" ]; then
  NV=$(find "$VOL" -type f 2>/dev/null | wc -l)
  NB=$(find "$DIR/media" -type f 2>/dev/null | wc -l)
  [ "$NV" -gt 0 ] && [ "$NB" -lt "$NV" ] &&
    add "Médias sauvegardés incomplets : ${NB} fichiers copiés sur ${NV}."
fi

# Conteneurs : tout ce qui n'est pas « running » est un incident.
for svc in db app nginx; do
  state=$(docker compose ps --format '{{.State}}' "$svc" 2>/dev/null | head -1)
  case "$state" in
    running) ;;
    '') add "Le conteneur « $svc » est absent." ;;
    *) add "Le conteneur « $svc » est dans l'état « $state »." ;;
  esac
done

# La base répond-elle vraiment ? (le 20/08 elle bouclait en recovery)
docker compose exec -T db pg_isready -U whitelabel -d whitelabel_site >/dev/null 2>&1 ||
  add 'PostgreSQL ne répond pas.'

# JSON : un tableau de chaînes échappées.
JSON_PROBLEMS=$(printf '%s' "$PROBLEMS" | awk 'NF' | sed 's/\\/\\\\/g; s/"/\\"/g; s/.*/"&"/' | paste -sd, -)
JSON=$(cat <<EOF
{"at":"$(date -Iseconds)","diskPct":$PCT,"freeGb":$FREE_GB,"backupAgeH":${AGE_H:-null},"backupSize":"$SIZE","problems":[$JSON_PROBLEMS]}
EOF
)

# Remontée dans la base pour le bandeau d'administration.
printf '%s' "$JSON" | docker compose exec -T db psql -q -U whitelabel -d whitelabel_site \
  -c "CREATE TEMP TABLE h (v JSONB);" \
  -c "\\copy h FROM PSTDIN" \
  -c "INSERT INTO settings (key, value) SELECT 'health', v FROM h
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();" \
  >/dev/null 2>&1 || echo "$(date -Is) remontée en base impossible" >>"$LOG"

if [ -n "$(printf '%s' "$PROBLEMS" | awk 'NF')" ]; then
  echo "$(date -Is) PROBLEMES :" >>"$LOG"
  printf '%s' "$PROBLEMS" | awk 'NF {print "  - " $0}' >>"$LOG"
else
  echo "$(date -Is) OK disque ${PCT}% libre ${FREE_GB}Go sauvegarde ${AGE_H}h" >>"$LOG"
fi

# Rotation simple du journal.
[ -f "$LOG" ] && [ "$(stat -c %s "$LOG")" -gt 1048576 ] && tail -500 "$LOG" >"$LOG.tmp" && mv "$LOG.tmp" "$LOG"
exit 0
