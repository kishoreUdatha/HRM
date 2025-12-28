@echo off
set PATH=%PATH%;C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin
az aks get-credentials --resource-group hrm-production-rg --name hrm-production-aks --overwrite-existing
kubectl get nodes
