// Map ProductUnit enum values to Mongolian labels
const UNIT_LABELS: Record<string, string> = {
  PIECE: 'ширхэг',
  BOX: 'хайрцаг',
  KG: 'кг',
  LITER: 'литр',
  PACK: 'баглаа',
  // Fallback for old string values
  piece: 'ширхэг',
};

export function unitLabel(unit: string): string {
  return UNIT_LABELS[unit] || unit;
}
