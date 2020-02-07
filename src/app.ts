/* eslint-disable @typescript-eslint/ban-ts-ignore */

import path from 'path'
import logger from './logger'
import * as config from './config'
import * as deps from './scripts/deps'
import * as serverScripts from './scripts/server'
import * as clientScripts from './scripts/client'
import * as gRPCServer from './grpc-server'
import { EnvCheck } from './envcheck'
import {
  InstallDependencies,
  ProtobufDefinitions,
  ReloadAndBundleClientScripts,
  ReloadServerScripts,
  ScriptWatcher,
} from './support'

/**
 *
 * Main Corredor responsibilities
 *
 *  1. @todo load remote (git-repo) scripts (if not local)
 *  2. watch and reload dependencies (if src/package.json exists)
 *  3.  watch frontend-script changes, run tests (if any) and (re)bundle scripts
 *  4. watching backend-script changes and (re)link them to gRPC service
 *     @todo run tests?
 *  5. start gRPC server
 *
 * Misc:
 *   - secret management
 */

EnvCheck()

let clientScriptsService: clientScripts.Service
let serverScriptsService: serverScripts.Service

if (config.scripts.client.enabled) {
  logger.debug('initializing client-scripts service')
  clientScriptsService = new clientScripts.Service(config.scripts.client)
}

if (config.scripts.server.enabled) {
  logger.debug('initializing server-scripts service')
  serverScriptsService = new serverScripts.Service(config.scripts.exec)
}

ProtobufDefinitions()
  .then(corredor => {
    const serviceDefinitions: gRPCServer.ServiceDefinition = new Map()
    serviceDefinitions.set(
      // @ts-ignore
      corredor.ServerScripts.service,
      serverScripts.Handlers(
        serverScriptsService,
        logger.child({ system: 'gRPC', service: 'ServerScripts' }),
      ),
    )

    serviceDefinitions.set(
      // @ts-ignore
      corredor.ClientScripts.service,
      clientScripts.Handlers(
        clientScriptsService,
        logger.child({ system: 'gRPC', service: 'ClientScripts' }),
      ),
    )

    logger.debug('starting gRPC server')
    gRPCServer.Start(config.server, logger, serviceDefinitions)
  })

async function reload (): Promise<unknown> {
  return Promise.all([
    ReloadServerScripts(serverScriptsService),
    ReloadAndBundleClientScripts(clientScriptsService),
  ])
}

async function installAndReload (): Promise<unknown> {
  return InstallDependencies().then(reload)
}

if (config.scripts.enabled) {
  // App entry point
  installAndReload().then(() => {
    if (config.scripts.dependencies.autoUpdate) {
      // Setup dependency watcher that installs
      // dependencies on change & reloads server-scripts
      return deps.Watcher(config.scripts.dependencies.packageJSON, installAndReload)
    }
  }).then(() => {
    // Setup serve & client script watchers
    // that will reload server-side scripts
    ScriptWatcher(
      () => ReloadServerScripts(serverScriptsService),
      config.scripts.server,
    )
    ScriptWatcher(
      () => ReloadAndBundleClientScripts(clientScriptsService),
      config.scripts.client,
    )
  })
} else {
  logger.warn('running without enabled script services')
}


