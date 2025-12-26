@echo off
set PATH=%PATH%;C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin
cd /d C:\Users\KishoreUdatha\IdeaProjects\HRM\infrastructure\terraform

REM Note: MongoDB is now deployed internally in AKS cluster
REM No external database connection string needed

terraform apply -auto-approve
