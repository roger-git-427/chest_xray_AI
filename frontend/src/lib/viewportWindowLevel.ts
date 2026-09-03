export type WindowPreset = 'default' | 'lung' | 'bone' | 'mediastinum';

/** Aproximaciones en el cliente de presets de ventana habituales en radiografía de tórax (no son W/L DICOM). */
export function buildViewportFilter(
  preset: WindowPreset,
  inverted: boolean,
): string | undefined {
  const parts: string[] = [];
  if (inverted) parts.push('invert(1)');

  switch (preset) {
    case 'lung':
      parts.push('contrast(1.35)', 'brightness(1.06)');
      break;
    case 'bone':
      parts.push('contrast(1.55)', 'brightness(0.88)');
      break;
    case 'mediastinum':
      parts.push('contrast(1.15)', 'brightness(1.02)');
      break;
    default:
      break;
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}
