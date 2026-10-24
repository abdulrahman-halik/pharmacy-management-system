/**
 * 4-tier packaging engine. All stock is stored as an integer count of base units
 * (tablet, vial, pouch); higher tiers are pure integer multipliers of that base.
 */

export const PACKAGING_LEVELS = ['UNIT', 'PACKET', 'BOX', 'CARTON'] as const;
export type PackagingLevel = (typeof PACKAGING_LEVELS)[number];

export interface PackagingHierarchy {
  baseUnitName: string;
  unitsPerPacket: number;
  packetsPerBox?: number | null;
  boxesPerCarton?: number | null;
}

export type PackagingMultipliers = Record<PackagingLevel, number | null> & { UNIT: 1; PACKET: number };

export interface UnpackedQuantity {
  cartons: number;
  boxes: number;
  packets: number;
  looseUnits: number;
  summary: string;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${label} must be a positive integer, received ${value}.`);
  }
}

function assertSafeProduct(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} exceeds the safe integer range.`);
  }
  return value;
}

export function computePackagingMultipliers(pkg: PackagingHierarchy): PackagingMultipliers {
  assertPositiveInteger(pkg.unitsPerPacket, 'unitsPerPacket');
  if (pkg.packetsPerBox != null) assertPositiveInteger(pkg.packetsPerBox, 'packetsPerBox');
  if (pkg.boxesPerCarton != null) assertPositiveInteger(pkg.boxesPerCarton, 'boxesPerCarton');
  if (pkg.boxesPerCarton != null && pkg.packetsPerBox == null) {
    throw new RangeError('boxesPerCarton requires packetsPerBox to be configured.');
  }

  const unitsPerPacket = pkg.unitsPerPacket;
  const unitsPerBox =
    pkg.packetsPerBox != null ? assertSafeProduct(unitsPerPacket * pkg.packetsPerBox, 'unitsPerBox') : null;
  const unitsPerCarton =
    unitsPerBox != null && pkg.boxesPerCarton != null
      ? assertSafeProduct(unitsPerBox * pkg.boxesPerCarton, 'unitsPerCarton')
      : null;

  return { UNIT: 1, PACKET: unitsPerPacket, BOX: unitsPerBox, CARTON: unitsPerCarton };
}

export function isPackagingLevelConfigured(level: PackagingLevel, pkg: PackagingHierarchy): boolean {
  return computePackagingMultipliers(pkg)[level] != null;
}

export function convertToUnits(quantity: number, level: PackagingLevel, pkg: PackagingHierarchy): number {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError(`Quantity must be a non-negative integer, received ${quantity}.`);
  }
  const factor = computePackagingMultipliers(pkg)[level];
  if (factor == null) {
    throw new Error(`Packaging level ${level} is not configured for this medicine.`);
  }
  return assertSafeProduct(quantity * factor, 'Converted quantity');
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function unpackUnitsToHierarchy(totalUnits: number, pkg: PackagingHierarchy): UnpackedQuantity {
  if (!Number.isSafeInteger(totalUnits) || totalUnits < 0) {
    throw new RangeError(`totalUnits must be a non-negative integer, received ${totalUnits}.`);
  }
  const { PACKET, BOX, CARTON } = computePackagingMultipliers(pkg);
  let remaining = totalUnits;

  const take = (factor: number | null): number => {
    if (factor == null) return 0;
    const count = Math.floor(remaining / factor);
    remaining -= count * factor;
    return count;
  };

  const cartons = take(CARTON);
  const boxes = take(BOX);
  const packets = PACKET > 1 ? take(PACKET) : 0;
  const looseUnits = remaining;

  const parts = [
    cartons ? pluralize(cartons, 'Carton', 'Cartons') : '',
    boxes ? pluralize(boxes, 'Box', 'Boxes') : '',
    packets ? pluralize(packets, 'Packet', 'Packets') : '',
    looseUnits ? `${looseUnits} ${pkg.baseUnitName}` : '',
  ].filter(Boolean);

  return {
    cartons,
    boxes,
    packets,
    looseUnits,
    summary: parts.length ? parts.join(' ') : `0 ${pkg.baseUnitName}`,
  };
}

/** Converts a 2-decimal LKR amount into integer cents so price comparisons never use float math. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) throw new RangeError(`Invalid amount: ${amount}`);
  return Math.round(amount * 100);
}

/** Maximum allowed selling price (in cents) for a packaging level given the per-base-unit MRP. */
export function maxPriceCentsForLevel(
  mrpPerUnit: number,
  level: PackagingLevel,
  pkg: PackagingHierarchy,
): number | null {
  const factor = computePackagingMultipliers(pkg)[level];
  return factor == null ? null : assertSafeProduct(toCents(mrpPerUnit) * factor, 'Price ceiling');
}
