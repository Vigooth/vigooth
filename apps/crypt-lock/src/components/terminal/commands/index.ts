import { CommandFn } from './types'
import { help } from './help'
import { cd } from './cd'
import { pwd } from './pwd'
import { add } from './add'
import { mkdir } from './mkdir'
import { rmdir } from './rmdir'
import { ls } from './ls'
import { cat } from './cat'
import { gen } from './gen'

export type { CommandContext, CommandResult, CommandFn } from './types'

export const commands: Record<string, CommandFn> = {
  HELP: help,
  CD: cd,
  PWD: pwd,
  ADD: add,
  MKDIR: mkdir,
  RMDIR: rmdir,
  LS: ls,
  CAT: cat,
  GEN: gen,
}
