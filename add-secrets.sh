#!/bin/bash

RABBITMQ_URL=$(echo -n "amqp://hrm:hrm_password_2025@rabbitmq:5672" | base64)
SMTP_HOST=$(echo -n "smtp.sendgrid.net" | base64)
SMTP_PORT=$(echo -n "587" | base64)
SMTP_USER=$(echo -n "apikey" | base64)
SMTP_PASS=$(echo -n "placeholder" | base64)
OPENAI_API_KEY=$(echo -n "placeholder" | base64)
RAZORPAY_KEY_ID=$(echo -n "placeholder" | base64)
RAZORPAY_KEY_SECRET=$(echo -n "placeholder" | base64)

kubectl patch secret hrm-secrets -n hrm-production --type='json' -p="[
  {\"op\":\"add\",\"path\":\"/data/RABBITMQ_URL\",\"value\":\"$RABBITMQ_URL\"},
  {\"op\":\"add\",\"path\":\"/data/SMTP_HOST\",\"value\":\"$SMTP_HOST\"},
  {\"op\":\"add\",\"path\":\"/data/SMTP_PORT\",\"value\":\"$SMTP_PORT\"},
  {\"op\":\"add\",\"path\":\"/data/SMTP_USER\",\"value\":\"$SMTP_USER\"},
  {\"op\":\"add\",\"path\":\"/data/SMTP_PASS\",\"value\":\"$SMTP_PASS\"},
  {\"op\":\"add\",\"path\":\"/data/OPENAI_API_KEY\",\"value\":\"$OPENAI_API_KEY\"},
  {\"op\":\"add\",\"path\":\"/data/RAZORPAY_KEY_ID\",\"value\":\"$RAZORPAY_KEY_ID\"},
  {\"op\":\"add\",\"path\":\"/data/RAZORPAY_KEY_SECRET\",\"value\":\"$RAZORPAY_KEY_SECRET\"}
]"

echo "Secrets added!"
