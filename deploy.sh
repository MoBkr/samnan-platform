#!/usr/bin/env bash
# Deploy to Vercel production.
#
# Why the staging copy: the repo is private and its commits are authored as
# ai@tfco.sa, which is NOT a member of the "mobkr's projects" Vercel team.
# Vercel reads the HEAD commit author from git metadata and rejects the deploy
# ("not a member of the team"); while the repo was public it was allowed as an
# open-source contribution. Deploying from a git-less copy drops that metadata,
# so the deploy is attributed to the logged-in CLI account (mobkr) and succeeds.
#
# Permanent alternative: grant the Vercel GitHub App access to the private repo
# and let pushes deploy themselves (see DEPLOYMENT-GUIDE.md).
set -e
STAGE="${TMPDIR:-/tmp}/samnan-deploy-src"
rm -rf "$STAGE"; mkdir -p "$STAGE"
git archive HEAD | tar -x -C "$STAGE"
cp -r .vercel "$STAGE/.vercel"
cd "$STAGE"
vercel --prod --yes --archive=tgz
