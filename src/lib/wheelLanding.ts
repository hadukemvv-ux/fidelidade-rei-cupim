/** Alinha o centro de uma das seis fatias ao ponteiro no topo após cinco voltas. */
export function rotationForSector(current: number, sectorIndex: number) {
  if (!Number.isFinite(current) || !Number.isInteger(sectorIndex) || sectorIndex < 0 || sectorIndex > 5) {
    throw new Error("Fatia inválida.");
  }
  const center = sectorIndex * 60 + 30;
  return current + 1800 + ((360 - center - (current % 360) + 360) % 360);
}
