import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const appRoot = resolve(import.meta.dirname, '..')
const source = resolve(appRoot, '..', 'rive', 'kettlebell-bot.riv')
const destination = resolve(appRoot, 'public', 'kettlebell-bot.riv')

mkdirSync(resolve(appRoot, 'public'), { recursive: true })
copyFileSync(source, destination)
console.log('Synced the current Rive asset into playground/public/.')
