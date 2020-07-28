#!/bin/bash

export MONITORING_DIR='./test/etc/monitoring'
export TS_NODE_FILES=true
npx mocha --exit -r ts-node/register test/*.spec.ts
