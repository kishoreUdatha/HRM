#!/bin/bash
JWT_ACCESS=$(openssl rand -base64 64 | base64 | tr -d '\n')
JWT_REFRESH=$(openssl rand -base64 64 | base64 | tr -d '\n')
kubectl patch secret hrm-secrets -n hrm-production --type='json' -p="[{\"op\":\"replace\",\"path\":\"/data/JWT_ACCESS_SECRET\",\"value\":\"$JWT_ACCESS\"},{\"op\":\"replace\",\"path\":\"/data/JWT_REFRESH_SECRET\",\"value\":\"$JWT_REFRESH\"}]"
echo "JWT secrets updated!"
