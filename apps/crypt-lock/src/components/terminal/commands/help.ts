import { CommandFn } from './types'

export const help: CommandFn = (_args, _ctx, t) => {
  return {
    output: `${t('terminal.help.title')}
  ${t('terminal.help.cd')}
  ${t('terminal.help.add')}
  ${t('terminal.help.addFolder')}
  ${t('terminal.help.mkdir')}
  ${t('terminal.help.rmdir')}
  ${t('terminal.help.ls')}
  ${t('terminal.help.cat')}
  ${t('terminal.help.gen')}
  ${t('terminal.help.pwd')}`
  }
}
