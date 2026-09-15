#!/usr/bin/env bash
# 예약된 후속 알림을 발송하는 내부 엔드포인트를 호출한다.
# cron 등 스케줄러가 주기적으로(예: 15분마다) 이 스크립트를 실행하도록 등록한다.
#
# 사용 예:
#   APP_URL=http://localhost:3000 CRON_SECRET=xxxx ./scripts/dispatch-followups.sh
#
# crontab 예시 (15분마다):
#   */15 * * * * APP_URL=http://localhost:3000 CRON_SECRET=xxxx /path/to/somemate/scripts/dispatch-followups.sh >> /var/log/somemate-followups.log 2>&1

set -euo pipefail

: "${APP_URL:?APP_URL 환경변수가 필요합니다 (예: http://localhost:3000)}"
: "${CRON_SECRET:?CRON_SECRET 환경변수가 필요합니다}"

curl -fsS -X POST "$APP_URL/api/internal/followups/dispatch" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -w '\n'
