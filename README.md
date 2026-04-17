# 1. Create project with NxetJS frontend bolerplate by:

npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir  

# 2. backednd side will be added manually 

====================================================

# access to app via internet (from cloudfront)

https://d340rgajzh7p4.cloudfront.net/     (dev)
https://dsq4r0cbghqha.cloudfront.net/     (test) 

# Run deployment with Terraform:

- cd \terraform 
- terraform init 

- cd ..\
- .\scripts\deploy.ps1 dev 

( or - .\scripts\deploy.ps1 test )  

# Destroy all resources 

.\scripts\destroy.ps1 test  
