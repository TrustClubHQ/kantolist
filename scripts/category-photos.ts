/**
 * A photo per leaf category, used when a listing has no photo of its own.
 *
 * Real sellers upload their own; these exist so the demo board is never a wall
 * of placeholders. Files live in public/demo and are freely licensed — see
 * public/demo/CREDITS.md. The seed skips any entry whose file is missing, so a
 * category listed here without its file simply falls back to CategoryMark.
 */
export const CATEGORY_PHOTOS: Record<string, string[]> = {
  // Vehicles
  motorcycle: ['click.jpg', 'mio-soul.jpg', 'click160.jpg', 'nmax.jpg', 'click-hero.jpg'],
  bicycle: ['bike.jpg'],
  tricycle: ['tricycle.jpg', 'tricycle2.jpg'],
  'car-van-truck': ['car.jpg', 'van.jpg'],

  // Electronics
  'phone-tablet': ['phone.jpg'],
  'laptop-computer': ['laptop.jpg', 'printer.jpg'],
  'sound-lights': ['speaker.jpg', 'videoke.jpg'],
  appliances: ['fridge.jpg', 'fan.jpg', 'aircon.jpg'],

  // Tools, home
  'power-tools': ['tools.jpg', 'generator.jpg', 'welding.jpg'],
  furniture: ['sofa.jpg', 'bed.jpg', 'table.jpg'],

  // Services
  repair: ['repair.jpg', 'aircon.jpg', 'tools.jpg'],
  construction: ['construction.jpg', 'welding.jpg'],
  'transport-hauling': ['van.jpg'],
  'events-food': ['catering.jpg'],
  'beauty-wellness': ['nails.jpg', 'barber.jpg', 'massage.jpg'],
  laundry: ['laundry.jpg'],
  printing: ['printing.jpg', 'printer.jpg'],
  tutoring: ['tutor.jpg'],
  'water-lpg': ['water.jpg', 'lpg.jpg'],

  // Farm
  livestock: ['chicken.jpg', 'pig.jpg', 'goat.jpg', 'duck.jpg'],
  'farm-supplies': ['fertilizer.jpg', 'vegetables.jpg'],

  // Food & produce
  'rice-grains': ['rice.jpg'],
  'vegetables-fruits': ['vegetables.jpg', 'fruit.jpg'],
  'homemade-food': ['kakanin.jpg', 'catering.jpg'],
  'fish-meat': ['fish.jpg', 'chicken.jpg'],

  // Fashion & baby
  clothes: ['clothes.jpg'],
  'shoes-bags': ['shoes.jpg'],
  'baby-items': ['baby.jpg'],
}

/**
 * Pick one deterministically from the category's pool, so a category with
 * several photos does not repeat the same shot down a column, and re-seeding
 * produces the same board.
 */
export function photoForCategory(
  categorySlug: string,
  seed: string,
  isAvailable: (file: string) => boolean = () => true,
): string | null {
  // Filter before picking: choosing from the full pool and then discarding a
  // missing file would leave the listing with no photo even though the category
  // has other options.
  const pool = (CATEGORY_PHOTOS[categorySlug] ?? []).filter(isAvailable)
  if (!pool.length) return null
  const n = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0)
  return pool[n % pool.length]
}
