import { CommandFn } from './types'

export const pwd: CommandFn = (_args, ctx) => {
  return { output: ctx.currentFolder ? ctx.currentFolder.name : 'ROOT' }
}
