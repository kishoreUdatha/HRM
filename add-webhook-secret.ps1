$secret = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("placeholder"))
kubectl patch secret hrm-secrets -n hrm-production --type='json' -p="[{`"op`":`"add`",`"path`":`"/data/RAZORPAY_WEBHOOK_SECRET`",`"value`":`"$secret`"}]"
Write-Host "RAZORPAY_WEBHOOK_SECRET added!"
