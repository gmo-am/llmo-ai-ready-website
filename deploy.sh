#!/usr/bin/env bash
set -e

gcloud builds submit \
  --config=cloudbuild.yaml \
  --region=asia-northeast1 \
  --service-account=projects/gmo-am-common/serviceAccounts/cloudbuild-runner@gmo-am-common.iam.gserviceaccount.com

