# Releasing Guide

Pushes to master will update [this s3 bucket](http://trimark-loot-distribution.s3-website-us-east-1.amazonaws.com/)
Pushes to staging will update [this s3 bucket](http://trimark-loot-distribution-staging.s3-website-us-east-1.amazonaws.com/)

We push using boto3 python package, github secrets and github actions viewable in [workflows](.github/workflows)
