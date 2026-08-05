/**
 * Half-width katakana + digits + punctuation, the glyph set used by the
 * film's code rain. Half-width forms matter: they render on a near-square
 * advance in monospace fonts, which keeps the grid from stretching.
 */
export const MATRIX_CHARSET =
  'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:=*+-<>¦';

/**
 * The same glyphs, grouped into tiers of increasing ink coverage — sparse marks
 * first, dense multi-stroke forms last.
 *
 * This is what makes the photograph legible through the code. Picking a glyph
 * at random flattens every cell to the same visual weight, so only opacity
 * carries tone; picking from the tier that matches a cell's brightness makes
 * the glyphs themselves shade the image, the way ASCII art does. Cells keep
 * churning inside their own tier, so the tone holds still while the characters
 * flicker.
 */
export const MATRIX_RAMP: readonly string[] = [
  '.,･｡',
  'ｰ-=¦ｧｨｩ',
  'ｪｫｬｭｮｯ:+*<>',
  'ｦｲ7ｸｼ1ﾉﾊ',
  'ｽｿﾂﾋﾑﾒ23ﾌ',
  'ｱｳｴｵｷｺ45ﾃﾄﾏﾐ',
  'ｶｻｾﾀﾁﾅﾆ68ﾍﾎﾓﾔ',
  'ﾇﾈ09ﾕﾖﾗﾘﾙﾚﾛﾜﾝ',
];

export const MATRIX_GREEN = '#00ff41';

export const MATRIX_FONT_STACK =
  '"MS Gothic", "Osaka-Mono", "Courier New", ui-monospace, monospace';
