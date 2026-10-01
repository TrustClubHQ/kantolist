/**
 * Reference data: the municipalities and the category tree with its attribute
 * schemas. Shared by the development seed and the demo-content seed, and the
 * only part of seeding that is safe to run against production.
 */
import type { AttributeDef } from '../src/lib/attributes'

/**
 * The launch area. One town: San Ildefonso, Bulacan.
 *
 * Deliberately a list rather than a constant — adding the neighbouring towns
 * later is a seed edit, and the UI adapts on its own: with a single
 * municipality it drops the location filter and the town picker rather than
 * offering a choice of one.
 */
export const MUNICIPALITIES: { name: string; province: string }[] = [
  { name: 'San Ildefonso', province: 'Bulacan' },
]

/** Adjacency drives the "include nearby towns" filter. Undirected; stored both
 *  ways. Empty while we are in one town — there is no "nearby" to include. */
export const ADJACENT: [string, string][] = []

/** Real barangays of San Ildefonso, so seeded listings sit somewhere that exists. */
export const BARANGAYS = [
  'Poblacion', 'Pinaod', 'Bubulong Malaki', 'Calawitan', 'Sapang Dayap',
  'Upig', 'Garlang', 'Matimbubong', 'San Juan', 'Palapala', 'Akle', 'Gabihan',
]

const CONDITION: AttributeDef = {
  key: 'condition', label: 'Condition', type: 'enum',
  options: ['Brand new', 'Used', 'For parts'], filter: 'exact', required: true,
}

export interface SeedCategory {
  slug: string
  name: string
  icon?: string
  children: { slug: string; name: string; attributes: AttributeDef[] }[]
}

const NAMED_CATEGORIES: SeedCategory[] = [
  {
    slug: 'vehicles', name: 'Vehicles', icon: 'bicycle',
    children: [
      {
        slug: 'bicycle', name: 'Bicycle',
        attributes: [
          { key: 'bike_type', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Mountain', 'Road', 'BMX', 'Folding', 'E-bike', 'Kids'] },
          { key: 'frame_size', label: 'Frame size', type: 'enum', filter: 'exact',
            options: ['XS', 'S', 'M', 'L', 'XL'] },
          { key: 'wheel_size_in', label: 'Wheel size', type: 'int', unit: 'in', min: 12, max: 29, filter: 'exact' },
          CONDITION,
        ],
      },
    ],
  },
  {
    slug: 'electronics', name: 'Electronics', icon: 'phone',
    children: [
      {
        slug: 'phone-tablet', name: 'Phone / Tablet',
        attributes: [
          { key: 'brand', label: 'Brand', type: 'enum', filter: 'exact', required: true,
            options: ['Samsung', 'Apple', 'Xiaomi', 'Realme', 'Oppo', 'Vivo', 'Infinix', 'Other'] },
          { key: 'model', label: 'Model', type: 'text', filterable: false },
          { key: 'storage_gb', label: 'Storage', type: 'int', unit: 'GB', min: 4, max: 2048, filter: 'min' },
          CONDITION,
          { key: 'with_box', label: 'With box and charger', type: 'bool', filter: 'exact' },
        ],
      },
      {
        slug: 'appliances', name: 'Appliances',
        attributes: [
          { key: 'appliance_type', label: 'Type', type: 'text', filterable: false },
          { key: 'brand', label: 'Brand', type: 'text', filterable: false },
          CONDITION,
        ],
      },
    ],
  },
  {
    slug: 'tools-equipment', name: 'Tools & Equipment', icon: 'tools',
    children: [
      {
        slug: 'power-tools', name: 'Tools & machines',
        attributes: [
          { key: 'tool_type', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Welding', 'Generator', 'Water pump', 'Power tools', 'Grass cutter', 'Other'] },
          { key: 'brand', label: 'Brand', type: 'text', filterable: false },
          { key: 'power_w', label: 'Power', type: 'int', unit: 'W', min: 10, max: 50000, filter: 'min' },
          CONDITION,
        ],
      },
    ],
  },
  {
    slug: 'home-furniture', name: 'Home & Furniture', icon: 'home',
    children: [
      {
        slug: 'furniture', name: 'Furniture',
        attributes: [
          { key: 'furniture_type', label: 'Type', type: 'text', filterable: false },
          { key: 'material', label: 'Material', type: 'enum', filter: 'exact',
            options: ['Wood', 'Rattan', 'Metal', 'Plastic', 'Upholstered'] },
          CONDITION,
        ],
      },
    ],
  },
  {
    slug: 'services', name: 'Services', icon: 'repair',
    children: [
      {
        slug: 'repair', name: 'Repair',
        attributes: [
          { key: 'specialty', label: 'Specialty', type: 'enum', filter: 'exact', required: true,
            options: ['Motorcycle', 'Appliance', 'Phone', 'Electrical', 'Plumbing', 'Aircon', 'Other'] },
          { key: 'home_service', label: 'Home service', type: 'bool', filter: 'exact' },
        ],
      },
      {
        slug: 'construction', name: 'Construction & trades',
        attributes: [
          { key: 'trade', label: 'Trade', type: 'enum', filter: 'exact', required: true,
            options: ['Mason', 'Carpenter', 'Welder', 'Painter', 'Electrician', 'Plumber'] },
          { key: 'crew_size', label: 'Crew size', type: 'int', min: 1, max: 100, filter: 'min' },
        ],
      },
      {
        slug: 'beauty-wellness', name: 'Beauty & wellness',
        attributes: [
          { key: 'beauty_service', label: 'Service', type: 'enum', filter: 'exact', required: true,
            options: ['Haircut', 'Hair color / rebond', 'Manicure & pedicure', 'Gel nails', 'Massage / hilot', 'Make-up', 'Eyelash extension'] },
          { key: 'home_service', label: 'Home service', type: 'bool', filter: 'exact' },
        ],
      },
      {
        slug: 'printing', name: 'Printing & signage',
        attributes: [
          { key: 'print_type', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Tarpaulin', 'T-shirt printing', 'Invitations & giveaways', 'Sticker & decal', 'Layout only', 'Photocopy & documents'] },
          { key: 'rush', label: 'Rush orders accepted', type: 'bool', filter: 'exact' },
        ],
      },
      {
        slug: 'water-lpg', name: 'Water & LPG delivery',
        attributes: [
          { key: 'delivery_type', label: 'Delivers', type: 'enum', filter: 'exact', required: true,
            options: ['Purified water', 'Mineral water', 'LPG tank', 'Both water and LPG'] },
          { key: 'free_delivery', label: 'Free delivery', type: 'bool', filter: 'exact' },
        ],
      },
      {
        slug: 'events-food', name: 'Events & food',
        attributes: [
          { key: 'event_type', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Catering', 'Lechon', 'Photo / video', 'Sound system', 'Host'] },
          { key: 'capacity_pax', label: 'Capacity', type: 'int', unit: 'pax', min: 1, max: 5000, filter: 'min' },
        ],
      },
    ],
  },
  {
    slug: 'farm-animals', name: 'Farm & Animals', icon: 'farm',
    children: [
      {
        slug: 'livestock', name: 'Livestock & poultry',
        attributes: [
          { key: 'animal', label: 'Animal', type: 'enum', filter: 'exact', required: true,
            options: ['Cattle', 'Carabao', 'Goat', 'Pig', 'Chicken', 'Duck'] },
          { key: 'breed', label: 'Breed', type: 'text', filterable: false },
          { key: 'quantity', label: 'How many', type: 'int', min: 1, max: 10000, filter: 'min' },
        ],
      },
      {
        slug: 'farm-supplies', name: 'Feeds, seedlings & equipment',
        attributes: [
          { key: 'supply_type', label: 'Type', type: 'enum', filter: 'exact',
            options: ['Feeds', 'Seedlings', 'Fertiliser', 'Equipment'] },
        ],
      },
    ],
  },
  {
    slug: 'food-produce', name: 'Food & Produce', icon: 'rice',
    children: [
      {
        slug: 'rice-grains', name: 'Rice & grains',
        attributes: [
          { key: 'variety', label: 'Variety', type: 'enum', filter: 'exact', required: true,
            options: ['Dinorado', 'Sinandomeng', 'Jasmine', 'Well-milled', 'Regular milled', 'Brown rice', 'Corn grits'] },
          { key: 'pack_kg', label: 'Pack size', type: 'int', unit: 'kg', min: 1, max: 50, filter: 'exact' },
          { key: 'delivery', label: 'Delivery available', type: 'bool', filter: 'exact' },
        ],
      },
      {
        slug: 'vegetables-fruits', name: 'Vegetables & fruits',
        attributes: [
          { key: 'produce', label: 'Produce', type: 'text', filterable: false },
          { key: 'sold_by', label: 'Sold by', type: 'enum', filter: 'exact', required: true,
            options: ['Per kilo', 'Per piece', 'Per bundle', 'Per sack', 'Per tray'] },
          { key: 'organic', label: 'Organic', type: 'bool', filter: 'exact' },
        ],
      },
      {
        slug: 'homemade-food', name: 'Homemade food & delicacies',
        attributes: [
          { key: 'food_type', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Kakanin & delicacies', 'Baked goods', 'Ulam & viands', 'Frozen goods', 'Drinks', 'Peanut butter & spreads'] },
          { key: 'order_ahead_days', label: 'Order ahead', type: 'int', unit: 'days', min: 0, max: 14, filter: 'min' },
        ],
      },
      {
        slug: 'fish-meat', name: 'Fish & meat',
        attributes: [
          { key: 'source', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Fresh fish', 'Dried fish', 'Pork', 'Beef', 'Chicken', 'Seafood'] },
          { key: 'sold_by', label: 'Sold by', type: 'enum', filter: 'exact',
            options: ['Per kilo', 'Per piece', 'Per tray'] },
        ],
      },
    ],
  },
  {
    slug: 'clothing', name: 'Clothing', icon: 'clothes',
    children: [
      {
        slug: 'clothes', name: 'Clothes & ukay-ukay',
        attributes: [
          { key: 'clothing_type', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Bale / bulk ukay', 'Dresses', 'Shirts & tops', 'Pants & jeans', 'Jackets', 'Uniform', 'Gowns & formal'] },
          { key: 'size', label: 'Size', type: 'enum', filter: 'exact',
            options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Assorted'] },
          { key: 'gender', label: 'For', type: 'enum', filter: 'exact',
            options: ['Women', 'Men', 'Unisex', 'Kids'] },
          { key: 'condition', label: 'Condition', type: 'enum', filter: 'exact', required: true,
            options: ['Brand new', 'Used', 'For parts'] },
        ],
      },
      {
        slug: 'shoes-bags', name: 'Shoes & bags',
        attributes: [
          { key: 'item_type', label: 'Type', type: 'enum', filter: 'exact', required: true,
            options: ['Sneakers', 'Sandals & slippers', 'School shoes', 'Boots', 'Handbag', 'Backpack'] },
          { key: 'shoe_size', label: 'Size', type: 'int', min: 20, max: 50, filter: 'exact' },
          { key: 'condition', label: 'Condition', type: 'enum', filter: 'exact', required: true,
            options: ['Brand new', 'Used', 'For parts'] },
        ],
      },
      {
        slug: 'baby-items', name: 'Baby & kids',
        attributes: [
          { key: 'baby_item', label: 'Item', type: 'enum', filter: 'exact', required: true,
            options: ['Stroller', 'Crib', 'Car seat', 'Walker', 'High chair', 'Toys', 'Clothes'] },
          { key: 'condition', label: 'Condition', type: 'enum', filter: 'exact', required: true,
            options: ['Brand new', 'Used', 'For parts'] },
        ],
      },
    ],
  },
]

/**
 * Every group ends with an "Other" leaf.
 *
 * The posting form can only offer the specific children — a group heading is
 * an optgroup label, which is not selectable — so without this a seller whose
 * thing matches no named child has nothing legal to pick. It carries no
 * attributes on purpose: the leaf exists because the thing does not fit a
 * shape, so it must not then demand shape-specific answers.
 *
 * Mirrored by the 20261001120000_other_subcategories migration, which is how
 * these reach a database the seed never touches (production).
 */
export const CATEGORIES: SeedCategory[] = NAMED_CATEGORIES.map((parent) => ({
  ...parent,
  children: [...parent.children, { slug: `other-${parent.slug}`, name: 'Other', attributes: [] }],
}))
