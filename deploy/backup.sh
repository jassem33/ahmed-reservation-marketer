#!/bin/sh
# Sauvegarde quotidienne. Installer sur l'hôte :
#   cp deploy/backup.sh /usr/local/bin/ahmedmarketer-backup.sh && chmod +x …
#   cron : 0 3 * * * /usr/local/bin/ahmedmarketer-backup.sh
#
# Depuis que les médias vivent sur disque (volume media-data) et non plus dans
# la colonne media.data, le dump SQL est passé de ~2 Go à quelques Mo. Les
# médias sont sauvegardés séparément par miroir incrémental : les fichiers sont
# immuables (nommés par UUID), donc seuls les nouveaux sont recopiés — une
# seule copie au lieu d'une par dump.
set -e
DIR=/var/backups/ahmedmarketer
KEEP=14             # dumps SQL conservés (quelques Mo chacun)
MIN_FREE_MB=4000    # espace libre exigé avant de démarrer
VOL=/var/lib/docker/volumes/ahmedmarketer_media-data/_data

cd /root/ahmedmarketer || exit 1
mkdir -p "$DIR"
log() { echo "$(date -Is) $*" >>"$DIR/last.log"; }

# 1. Purge d'abord (libère la place avant d'écrire, jamais après).
ls -1t "$DIR"/db-*.dump 2>/dev/null | tail -n +$KEEP | xargs -r rm -f

# 2. Garde-fou : on n'écrit pas si le disque ne peut pas l'absorber.
FREE=$(df -Pm "$DIR" | awk 'NR==2 {print $4}')
if [ "$FREE" -lt "$MIN_FREE_MB" ]; then
  log "ABANDON : ${FREE} Mo libres < ${MIN_FREE_MB} Mo requis"
  exit 1
fi

# 3. Dump dans un fichier temporaire, renommé seulement en cas de succès :
#    un dump tronqué ne remplace jamais une sauvegarde valide.
TMP="$DIR/db-$(date +%F).dump.part"
if docker compose exec -T db pg_dump -U whitelabel -Fc whitelabel_site >"$TMP" 2>"$DIR/pg_dump.err"; then
  mv "$TMP" "$DIR/db-$(date +%F).dump"
  log "OK dump $(du -h "$DIR/db-$(date +%F).dump" | cut -f1)"
else
  rm -f "$TMP"
  log "ECHEC pg_dump : $(tail -1 "$DIR/pg_dump.err" 2>/dev/null)"
  exit 1
fi

# 4. Miroir des médias (incrémental, une seule copie).
if [ -d "$VOL" ]; then
  mkdir -p "$DIR/media"
  if rsync -a --delete "$VOL/" "$DIR/media/"; then
    log "OK médias $(du -sh "$DIR/media" | cut -f1) ($(find "$DIR/media" -type f | wc -l) fichiers)"
  else
    log "ECHEC miroir des médias"
    exit 1
  fi
else
  log "ATTENTION : volume des médias introuvable ($VOL)"
fi
