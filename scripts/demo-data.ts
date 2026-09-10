/**
 * Demo content for KantoList — realistic Philippine province classifieds.
 *
 * Kept as plain data, separate from any driver, so the same dataset can be
 * written through Prisma (scripts/seed-demo.ts) or turned into SQL when a
 * direct Postgres connection is not available.
 *
 * Everything here is invented. Names, numbers and handles are fictional; the
 * phone numbers use the 0917-555-xxxx range, which is not a live block.
 */

export interface DemoAccount {
  trustclubId: string
  displayName: string
  municipality: string
  phone?: string
  messenger?: string
  viber?: string
  facebook?: string
  isStaff?: boolean
}

export interface DemoListing {
  owner: string
  category: string
  type: 'SELL' | 'RENT' | 'SERVICE'
  title: string
  price: number | null
  unit: 'TOTAL' | 'PER_HOUR' | 'PER_DAY' | 'PER_WEEK' | 'PER_MONTH' | 'PER_JOB' | 'QUOTE'
  negotiable?: boolean
  municipality: string
  barangay?: string
  description: string
  attributes: Record<string, string | number | boolean>
  daysAgo: number
  status?: 'ACTIVE' | 'RESERVED' | 'CLOSED'
  /** Filenames under /public/demo. See public/demo/CREDITS.md — these are
      freely licensed stand-ins, NOT photos of the listed items. */
  images?: string[]
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { trustclubId: 'juan.santos', displayName: 'Juan Santos', municipality: 'Calamba', phone: '+639175550101', messenger: 'juan.santos' },
  { trustclubId: 'ruben.dlc', displayName: "Mang Ruben's Rentals", municipality: 'Calamba', phone: '+639175550102', messenger: 'ruben.rentals', viber: '+639175550102' },
  { trustclubId: 'marites.g', displayName: 'Marites Garcia', municipality: 'Los Baños', phone: '+639175550103', messenger: 'marites.garcia' },
  { trustclubId: 'boyet.motors', displayName: 'Boyet Motorworks', municipality: 'Los Baños', phone: '+639175550104', messenger: 'boyetmotorworks' },
  { trustclubId: 'lito.reyes', displayName: 'Lito Reyes', municipality: 'Bay', phone: '+639175550105' },
  { trustclubId: 'ana.cruz', displayName: 'Ana Cruz', municipality: 'Cabuyao', phone: '+639175550106', messenger: 'ana.cruz.98' },
  { trustclubId: 'nene.sari', displayName: "Nene's Sari-sari", municipality: 'Calauan', phone: '+639175550107', messenger: 'nenesarisari' },
  { trustclubId: 'edgar.p', displayName: 'Edgar Pascual', municipality: 'Santa Cruz', phone: '+639175550108' },
  { trustclubId: 'jm.tech', displayName: 'JM Gadgets', municipality: 'Santa Rosa', phone: '+639175550109', messenger: 'jmgadgets.ph', facebook: 'https://facebook.com/jmgadgetsph' },
  { trustclubId: 'tessie.b', displayName: 'Tessie Bautista', municipality: 'Biñan', phone: '+639175550110' },
  { trustclubId: 'noel.aircon', displayName: 'Noel Aircon Services', municipality: 'Cabuyao', phone: '+639175550111', messenger: 'noelaircon', viber: '+639175550111' },
  { trustclubId: 'rico.hauling', displayName: 'Rico Hauling', municipality: 'Calamba', phone: '+639175550112', messenger: 'ricohauling' },
  { trustclubId: 'dely.farm', displayName: 'Dely Farm Supply', municipality: 'Victoria', phone: '+639175550113' },
  { trustclubId: 'toto.welding', displayName: 'Toto Welding Shop', municipality: 'Pila', phone: '+639175550114' },
  { trustclubId: 'grace.l', displayName: 'Grace Lim', municipality: 'San Pablo', phone: '+639175550115', messenger: 'grace.lim.sp' },
  { trustclubId: 'benjie.r', displayName: 'Benjie Ramos', municipality: 'Alaminos', phone: '+639175550116' },
  { trustclubId: 'lorna.catering', displayName: 'Lorna Catering Services', municipality: 'Calamba', phone: '+639175550117', messenger: 'lornacatering', facebook: 'https://facebook.com/lornacateringlaguna' },
  { trustclubId: 'dado.trike', displayName: 'Dado Mercado', municipality: 'Bay', phone: '+639175550118' },
  { trustclubId: 'weng.h', displayName: 'Weng Hernandez', municipality: 'Los Baños', phone: '+639175550119', messenger: 'weng.hernandez' },
  { trustclubId: 'ferdie.c', displayName: 'Ferdie Carandang', municipality: 'Calauan', phone: '+639175550120' },
  { trustclubId: 'mylene.s', displayName: 'Mylene Soriano', municipality: 'Santa Rosa', phone: '+639175550121', messenger: 'mylene.soriano' },
  { trustclubId: 'kap.tolits', displayName: 'Tolits Villanueva', municipality: 'Pila', phone: '+639175550122' },
  { trustclubId: 'jhun.tutor', displayName: 'Jhun Delos Reyes', municipality: 'Los Baños', phone: '+639175550123', messenger: 'jhun.dlr' },
  { trustclubId: 'kl-staff', displayName: 'KantoList Staff', municipality: 'Calamba', isStaff: true },
]

const USED = 'Used'
const NEW = 'Brand new'

export const DEMO_LISTINGS: DemoListing[] = [
  // ---- Motorcycles ----
  { owner: 'ruben.dlc', category: 'motorcycle', type: 'RENT', title: 'Honda Click 125i — daily rental', price: 450, unit: 'PER_DAY', negotiable: true,
    municipality: 'Calamba', barangay: 'Parian', daysAgo: 3,
    description: 'Well-maintained Click 125i, change oil every month, good tires. Helmet included, second one available on request. Pick-up at Parian or delivery within Calamba for ₱150. Weekly and monthly rates negotiable for long-term renters.',
    attributes: { brand: 'Honda', model: 'Click 125i', year: 2021, displacement_cc: 125, condition: USED, mileage_km: 18400, with_or_cr: true }, images: ["click.jpg", "click-hero.jpg"] },
  { owner: 'juan.santos', category: 'motorcycle', type: 'SELL', title: 'Honda Click 125i 2021, complete papers', price: 52000, unit: 'TOTAL', negotiable: true,
    municipality: 'Calamba', barangay: 'Real', daysAgo: 2,
    description: 'Second owner. OR/CR complete and updated until next year. Always garaged, never flooded. Casa maintained, receipts available. Meet at Calamba Crossing.',
    attributes: { brand: 'Honda', model: 'Click 125i', year: 2021, displacement_cc: 125, condition: USED, mileage_km: 12400, with_or_cr: true }, images: ["click-hero.jpg", "click.jpg"] },
  { owner: 'marites.g', category: 'motorcycle', type: 'RENT', title: 'Yamaha Mio Soul 115, weekly rate available', price: 2600, unit: 'PER_WEEK',
    municipality: 'Los Baños', barangay: 'Batong Malake', daysAgo: 6,
    description: 'Good for delivery riders. Weekly and monthly terms. ₱1,000 deposit plus valid ID. Unit is checked before every turnover.',
    attributes: { brand: 'Yamaha', model: 'Mio Soul 115', year: 2019, displacement_cc: 115, condition: USED, with_or_cr: true }, images: ["mio-soul.jpg"] },
  { owner: 'ana.cruz', category: 'motorcycle', type: 'SELL', title: 'Honda Click 160 ABS 2022, under warranty', price: 68000, unit: 'TOTAL',
    municipality: 'Cabuyao', daysAgo: 8,
    description: 'Still under casa warranty until March. Complete service records, all stock, no modifications. Selling because I am moving abroad.',
    attributes: { brand: 'Honda', model: 'Click 160 ABS', year: 2022, displacement_cc: 160, condition: USED, mileage_km: 6100, with_or_cr: true }, images: ["click160.jpg"] },
  { owner: 'lito.reyes', category: 'motorcycle', type: 'SELL', title: 'Yamaha NMAX 155 2022, all stock', price: 61500, unit: 'TOTAL',
    municipality: 'Los Baños', daysAgo: 4, status: 'RESERVED',
    description: 'All stock, nothing replaced except tires. Reserved pending pick-up this weekend — message me if the buyer backs out.',
    attributes: { brand: 'Yamaha', model: 'NMAX 155', year: 2022, displacement_cc: 155, condition: USED, mileage_km: 9800, with_or_cr: true }, images: ["nmax.jpg"] },
  { owner: 'benjie.r', category: 'motorcycle', type: 'SELL', title: 'Suzuki Raider J 115 Fi, rush sale', price: 34000, unit: 'TOTAL', negotiable: true,
    municipality: 'Alaminos', daysAgo: 11,
    description: 'Rush sale, need cash for tuition. Running condition, some scratches on the side cover. OR/CR complete. Tawad is okay for serious buyers.',
    attributes: { brand: 'Suzuki', model: 'Raider J 115 Fi', year: 2018, displacement_cc: 115, condition: USED, mileage_km: 41200, with_or_cr: true } },
  { owner: 'edgar.p', category: 'motorcycle', type: 'SELL', title: 'Honda TMX 125 Alpha, good for tricycle', price: 41000, unit: 'TOTAL',
    municipality: 'Santa Cruz', daysAgo: 14,
    description: 'Strong engine, good for sidecar. Used for hauling in the farm. New chain and sprocket last month.',
    attributes: { brand: 'Honda', model: 'TMX 125 Alpha', year: 2017, displacement_cc: 125, condition: USED, mileage_km: 68000, with_or_cr: true } },
  { owner: 'weng.h', category: 'motorcycle', type: 'SELL', title: 'Yamaha Mio i 125 2020, single owner', price: 44500, unit: 'TOTAL', negotiable: true,
    municipality: 'Los Baños', daysAgo: 5,
    description: 'Single owner, bought brand new. Used only for going to work in UPLB. Complete papers, no accidents.',
    attributes: { brand: 'Yamaha', model: 'Mio i 125', year: 2020, displacement_cc: 125, condition: USED, mileage_km: 15600, with_or_cr: true }, images: ["mio-soul.jpg"] },
  { owner: 'ferdie.c', category: 'motorcycle', type: 'SELL', title: 'Kawasaki Barako II 175, farm use', price: 38000, unit: 'TOTAL',
    municipality: 'Calauan', daysAgo: 19,
    description: 'Barako II, strong for hauling coconut and sacks. Repainted last year. OR/CR complete.',
    attributes: { brand: 'Kawasaki', model: 'Barako II 175', year: 2016, displacement_cc: 175, condition: USED, mileage_km: 82000, with_or_cr: true } },
  { owner: 'ruben.dlc', category: 'motorcycle', type: 'RENT', title: 'Honda Beat 110 for rent, monthly term', price: 7500, unit: 'PER_MONTH', negotiable: true,
    municipality: 'Calamba', barangay: 'Parian', daysAgo: 9,
    description: 'Monthly rental for students or delivery riders. Includes basic maintenance and one change oil per month. Deposit ₱2,000 and two valid IDs.',
    attributes: { brand: 'Honda', model: 'Beat 110', year: 2020, displacement_cc: 110, condition: USED, with_or_cr: true }, images: ["click.jpg"] },
  { owner: 'mylene.s', category: 'motorcycle', type: 'SELL', title: 'Yamaha Aerox 155 2023, like new', price: 92000, unit: 'TOTAL',
    municipality: 'Santa Rosa', daysAgo: 1,
    description: 'Bought last year, only 3,200 km. Kept in the garage, never used in the rain. With free helmet and cover.',
    attributes: { brand: 'Yamaha', model: 'Aerox 155', year: 2023, displacement_cc: 155, condition: USED, mileage_km: 3200, with_or_cr: true }, images: ["nmax.jpg"] },
  { owner: 'grace.l', category: 'motorcycle', type: 'SELL', title: 'Rusi Classic 150, no papers', price: 18000, unit: 'TOTAL', negotiable: true,
    municipality: 'San Pablo', daysAgo: 26,
    description: 'Selling as is. No OR/CR, that is why it is cheap. Good for parts or for use inside a subdivision or farm only. Do not buy if you need it registered.',
    attributes: { brand: 'Rusi', model: 'Classic 150', year: 2015, displacement_cc: 150, condition: USED, with_or_cr: false } },

  // ---- Bicycles ----
  { owner: 'ana.cruz', category: 'bicycle', type: 'SELL', title: 'Mountain bike 26", 21-speed', price: 4500, unit: 'TOTAL', negotiable: true,
    municipality: 'Cabuyao', daysAgo: 12,
    description: 'Working condition, brakes recently serviced. Small scratches on the frame. Good starter MTB for going around the barangay.',
    attributes: { bike_type: 'Mountain', frame_size: 'M', wheel_size_in: 26, condition: USED }, images: ["bike.jpg"] },
  { owner: 'jm.tech', category: 'bicycle', type: 'SELL', title: 'Folding bike 20", almost new', price: 6800, unit: 'TOTAL',
    municipality: 'Santa Rosa', daysAgo: 7,
    description: 'Used less than ten times. Folds small enough for a car trunk or a jeep. Complete with bag.',
    attributes: { bike_type: 'Folding', frame_size: 'S', wheel_size_in: 20, condition: USED } },
  { owner: 'tessie.b', category: 'bicycle', type: 'SELL', title: "Kids' BMX 16\", 4 to 7 years old", price: 2200, unit: 'TOTAL',
    municipality: 'Biñan', daysAgo: 16,
    description: 'Outgrown by my son. Still solid, with training wheels included if you need them.',
    attributes: { bike_type: 'Kids', wheel_size_in: 16, condition: USED } },
  { owner: 'weng.h', category: 'bicycle', type: 'SELL', title: 'E-bike, 3 months old, with charger', price: 24000, unit: 'TOTAL', negotiable: true,
    municipality: 'Los Baños', daysAgo: 3,
    description: 'Battery still strong, around 35 km per full charge. Selling because I bought a motorcycle. Charger and spare key included.',
    attributes: { bike_type: 'E-bike', frame_size: 'M', wheel_size_in: 26, condition: USED } },

  // ---- Tricycles ----
  { owner: 'dado.trike', category: 'tricycle', type: 'SELL', title: 'Tricycle with franchise, Bajaj 150', price: 95000, unit: 'TOTAL', negotiable: true,
    municipality: 'Bay', daysAgo: 5,
    description: 'Franchise included and transferable, still active with the LGU. Sidecar recently repainted, body in good shape. Serious buyers only please.',
    attributes: { trike_type: 'Motorcycle + sidecar', year: 2018, with_franchise: true, condition: USED }, images: ["tricycle.jpg"] },
  { owner: 'kap.tolits', category: 'tricycle', type: 'SELL', title: 'E-trike, 6 seaters, with new battery', price: 78000, unit: 'TOTAL',
    municipality: 'Pila', daysAgo: 13,
    description: 'New set of batteries installed last month. Quiet and cheap to run. Good for short routes inside the poblacion.',
    attributes: { trike_type: 'E-trike', year: 2021, with_franchise: false, condition: USED } },
  { owner: 'edgar.p', category: 'tricycle', type: 'SELL', title: 'Sidecar only, for TMX or Barako', price: 12000, unit: 'TOTAL', negotiable: true,
    municipality: 'Santa Cruz', daysAgo: 22,
    description: 'Sidecar only, no motorcycle. Frame is solid, needs repaint. Fits TMX and Barako mounting.',
    attributes: { trike_type: 'Motorcycle + sidecar', with_franchise: false, condition: USED }, images: ["tricycle.jpg"] },
  { owner: 'rico.hauling', category: 'car-van-truck', type: 'RENT', title: 'Closed van with driver, per day', price: 3500, unit: 'PER_DAY', negotiable: true,
    municipality: 'Calamba', daysAgo: 6,
    description: 'Closed van with driver for lipat-bahay or delivery anywhere in Laguna. Rate is for within Laguna; outside is by arrangement. Fuel included up to 100 km.',
    attributes: { brand: 'Mitsubishi L300', year: 2016, transmission: 'Manual', seats: 3, condition: USED } },
  { owner: 'grace.l', category: 'car-van-truck', type: 'SELL', title: 'Toyota Vios 2015 manual, well kept', price: 385000, unit: 'TOTAL', negotiable: true,
    municipality: 'San Pablo', daysAgo: 10,
    description: 'Casa maintained with records. No flood history. New tires last year. Registered until next year.',
    attributes: { brand: 'Toyota Vios', year: 2015, transmission: 'Manual', seats: 5, condition: USED } },
  { owner: 'ferdie.c', category: 'car-van-truck', type: 'SELL', title: 'Isuzu Elf mini dump truck', price: 620000, unit: 'TOTAL',
    municipality: 'Calauan', daysAgo: 24,
    description: 'Used for hauling sand and gravel. Engine overhauled two years ago. Selling because we are downsizing the business.',
    attributes: { brand: 'Isuzu Elf', year: 2012, transmission: 'Manual', seats: 3, condition: USED } },
  { owner: 'mylene.s', category: 'car-van-truck', type: 'RENT', title: 'Toyota Innova for rent, self-drive or with driver', price: 2800, unit: 'PER_DAY',
    municipality: 'Santa Rosa', daysAgo: 15,
    description: 'Self-drive requires two valid IDs and a deposit. With driver is ₱3,800 per day plus meals. Good for family trips or airport transfers.',
    attributes: { brand: 'Toyota Innova', year: 2019, transmission: 'Automatic', seats: 7, condition: USED } },

  // ---- Phones and tablets ----
  { owner: 'jm.tech', category: 'phone-tablet', type: 'SELL', title: 'Samsung Galaxy A15 5G, 128GB, complete', price: 7800, unit: 'TOTAL',
    municipality: 'Santa Rosa', daysAgo: 2,
    description: 'Openline, no issues. Complete with box, charger and receipt. Warranty until June. Meet up at Nuvali or Sta. Rosa.',
    attributes: { brand: 'Samsung', model: 'Galaxy A15 5G', storage_gb: 128, condition: USED, with_box: true } },
  { owner: 'ana.cruz', category: 'phone-tablet', type: 'SELL', title: 'iPhone 11 64GB, battery 82%', price: 12500, unit: 'TOTAL', negotiable: true,
    municipality: 'Cabuyao', daysAgo: 4,
    description: 'Factory unlocked, no iCloud lock. Battery health 82 percent, still lasts a full day with normal use. Small scratch on the back, screen is clean.',
    attributes: { brand: 'Apple', model: 'iPhone 11', storage_gb: 64, condition: USED, with_box: false } },
  { owner: 'jm.tech', category: 'phone-tablet', type: 'SELL', title: 'Xiaomi Redmi 13C, brand new sealed', price: 5299, unit: 'TOTAL',
    municipality: 'Santa Rosa', daysAgo: 1,
    description: 'Brand new and sealed, official Xiaomi warranty. We have stocks in blue and black. Cash on meet-up or GCash before delivery.',
    attributes: { brand: 'Xiaomi', model: 'Redmi 13C', storage_gb: 128, condition: NEW, with_box: true } },
  { owner: 'tessie.b', category: 'phone-tablet', type: 'SELL', title: 'Realme C55 8/256, 6 months used', price: 6200, unit: 'TOTAL', negotiable: true,
    municipality: 'Biñan', daysAgo: 9,
    description: 'Used for six months, no scratches, always in a case. Complete with box and original charger.',
    attributes: { brand: 'Realme', model: 'C55', storage_gb: 256, condition: USED, with_box: true } },
  { owner: 'weng.h', category: 'phone-tablet', type: 'SELL', title: 'Samsung Tab A8 for online class', price: 6500, unit: 'TOTAL',
    municipality: 'Los Baños', daysAgo: 18,
    description: 'Used by my daughter for online class, not needed anymore. Screen has no cracks. With keyboard case.',
    attributes: { brand: 'Samsung', model: 'Galaxy Tab A8', storage_gb: 64, condition: USED, with_box: false } },
  { owner: 'benjie.r', category: 'phone-tablet', type: 'SELL', title: 'Oppo A17 with issue, for parts', price: 1500, unit: 'TOTAL',
    municipality: 'Alaminos', daysAgo: 27,
    description: 'Screen is cracked and touch does not work on the left side. Everything else is fine. Selling for parts or for someone who can repair it.',
    attributes: { brand: 'Oppo', model: 'A17', storage_gb: 64, condition: 'For parts', with_box: false } },
  { owner: 'mylene.s', category: 'phone-tablet', type: 'SELL', title: 'Infinix Hot 40i, 8/256, still warranty', price: 5800, unit: 'TOTAL',
    municipality: 'Santa Rosa', daysAgo: 21, status: 'CLOSED',
    description: 'Sold already, thank you. Leaving this up so people can see the price.',
    attributes: { brand: 'Infinix', model: 'Hot 40i', storage_gb: 256, condition: USED, with_box: true } },
  { owner: 'juan.santos', category: 'phone-tablet', type: 'SELL', title: 'Vivo Y17s 6/128, complete package', price: 5900, unit: 'TOTAL', negotiable: true,
    municipality: 'Calamba', daysAgo: 7,
    description: 'Complete with box, charger, and free tempered glass and case. Used for four months only.',
    attributes: { brand: 'Vivo', model: 'Y17s', storage_gb: 128, condition: USED, with_box: true } },

  // ---- Laptops and computers ----
  { owner: 'jm.tech', category: 'laptop-computer', type: 'SELL', title: 'Acer Aspire 3, Ryzen 5, 8GB RAM', price: 18500, unit: 'TOTAL', negotiable: true,
    municipality: 'Santa Rosa', daysAgo: 5,
    description: 'Good for office work and online class. SSD upgraded to 512GB. Battery lasts around four hours. With charger and laptop bag.',
    attributes: { brand: 'Acer', ram_gb: 8, storage_gb: 512, condition: USED } },
  { owner: 'jhun.tutor', category: 'laptop-computer', type: 'SELL', title: 'Dell Latitude, i5, for office work', price: 11000, unit: 'TOTAL',
    municipality: 'Los Baños', daysAgo: 17,
    description: 'Business-class laptop, very durable. Windows 11 installed. Small dent on the lid, does not affect use.',
    attributes: { brand: 'Dell', ram_gb: 8, storage_gb: 256, condition: USED } },
  { owner: 'grace.l', category: 'laptop-computer', type: 'SELL', title: 'Desktop set for gaming, GTX 1650', price: 26000, unit: 'TOTAL', negotiable: true,
    municipality: 'San Pablo', daysAgo: 12,
    description: 'Complete set with monitor, keyboard and mouse. Runs Valorant and Dota smoothly. Selling because I am upgrading.',
    attributes: { brand: 'Custom build', ram_gb: 16, storage_gb: 1000, condition: USED } },
  { owner: 'edgar.p', category: 'laptop-computer', type: 'SELL', title: 'Printer Epson L3210, with ink', price: 5500, unit: 'TOTAL',
    municipality: 'Santa Cruz', daysAgo: 23,
    description: 'Print, scan and copy. Ink tank type so it is cheap to refill. Includes two extra bottles of black ink.',
    attributes: { brand: 'Epson', condition: USED } },

  // ---- Sound and lights ----
  { owner: 'marites.g', category: 'sound-lights', type: 'RENT', title: 'Videoke and sound system for fiestas', price: 1500, unit: 'PER_DAY', negotiable: true,
    municipality: 'Los Baños', daysAgo: 8,
    description: 'Two speakers, amplifier, two wireless mics and basic party lights. Delivery and set-up included within Los Baños and Bay. Book early for fiesta season.',
    attributes: { gear_type: 'Full set', wattage: 1200, condition: USED } },
  { owner: 'ruben.dlc', category: 'sound-lights', type: 'RENT', title: 'Party lights and smoke machine', price: 800, unit: 'PER_DAY',
    municipality: 'Calamba', daysAgo: 20,
    description: 'Par lights, moving head and one smoke machine. Good for birthdays and small events. Operator available for extra ₱500.',
    attributes: { gear_type: 'Lights', wattage: 600, condition: USED } },
  { owner: 'kap.tolits', category: 'sound-lights', type: 'SELL', title: 'Speaker 15 inch with stand, pair', price: 9500, unit: 'TOTAL', negotiable: true,
    municipality: 'Pila', daysAgo: 14,
    description: 'Loud enough for a covered court. Selling as a pair with stands. Cones are clean, no tears.',
    attributes: { gear_type: 'Speaker', wattage: 800, condition: USED } },
  { owner: 'ferdie.c', category: 'sound-lights', type: 'SELL', title: 'Amplifier, 2 channels, working', price: 3200, unit: 'TOTAL',
    municipality: 'Calauan', daysAgo: 30,
    description: 'Old but reliable amplifier. Both channels working. No remote.',
    attributes: { gear_type: 'Amplifier', wattage: 400, condition: USED } },

  // ---- Appliances ----
  { owner: 'tessie.b', category: 'appliances', type: 'SELL', title: 'Inverter aircon 1.0 HP, 2 years used', price: 12500, unit: 'TOTAL', negotiable: true,
    municipality: 'Biñan', daysAgo: 6,
    description: 'Cools fast and saves on electricity. Cleaned regularly. Selling because we moved to a smaller room. Buyer arranges the dismantling.',
    attributes: { appliance_type: 'Air conditioner', brand: 'Carrier', condition: USED } },
  { owner: 'nene.sari', category: 'appliances', type: 'SELL', title: 'Chest freezer 7 cu ft, for business', price: 14000, unit: 'TOTAL',
    municipality: 'Calauan', daysAgo: 11,
    description: 'Used in our sari-sari store for ice and frozen goods. Still freezes well. Selling because we bought a bigger one.',
    attributes: { appliance_type: 'Freezer', brand: 'Fujidenzo', condition: USED } },
  { owner: 'ana.cruz', category: 'appliances', type: 'SELL', title: 'Washing machine twin tub 8kg', price: 4800, unit: 'TOTAL', negotiable: true,
    municipality: 'Cabuyao', daysAgo: 15,
    description: 'Twin tub, spinner working. Some rust on the legs but it does not affect use.',
    attributes: { appliance_type: 'Washing machine', brand: 'Whirlpool', condition: USED } },
  { owner: 'weng.h', category: 'appliances', type: 'SELL', title: 'Rice cooker and gas stove, take all', price: 1800, unit: 'TOTAL',
    municipality: 'Los Baños', daysAgo: 25,
    description: 'Take all price for both. Moving out, everything must go this week.',
    attributes: { appliance_type: 'Kitchen', condition: USED } },
  { owner: 'mylene.s', category: 'appliances', type: 'SELL', title: 'Smart TV 43 inch, brand new', price: 13900, unit: 'TOTAL',
    municipality: 'Santa Rosa', daysAgo: 3,
    description: 'Brand new in box, unwanted raffle prize. Netflix and YouTube built in. With warranty card.',
    attributes: { appliance_type: 'Television', brand: 'TCL', condition: NEW } },
  { owner: 'benjie.r', category: 'appliances', type: 'SELL', title: 'Electric fan stand type, 2 units', price: 900, unit: 'TOTAL',
    municipality: 'Alaminos', daysAgo: 28,
    description: 'Two stand fans, both working. ₱450 each or ₱900 for both.',
    attributes: { appliance_type: 'Electric fan', condition: USED } },

  // ---- Tools and equipment ----
  { owner: 'toto.welding', category: 'power-tools', type: 'SELL', title: 'Welding machine 300A, heavy duty', price: 8500, unit: 'TOTAL', negotiable: true,
    municipality: 'Pila', daysAgo: 9,
    description: 'Inverter type welding machine, used in our shop. Comes with cables and holder. Still strong for 6013 rods.',
    attributes: { tool_type: 'Welding', brand: 'Ingco', power_w: 7000, condition: USED } },
  { owner: 'ferdie.c', category: 'power-tools', type: 'RENT', title: 'Generator 5kva for rent, events or brownout', price: 1200, unit: 'PER_DAY',
    municipality: 'Calauan', daysAgo: 13,
    description: 'Good for events or during long brownouts. Fuel not included. Delivery within Calauan and Victoria is free.',
    attributes: { tool_type: 'Generator', brand: 'Kawasaki', power_w: 5000, condition: USED } },
  { owner: 'edgar.p', category: 'power-tools', type: 'SELL', title: 'Water pump 1HP, jetmatic replacement', price: 3400, unit: 'TOTAL',
    municipality: 'Santa Cruz', daysAgo: 18,
    description: 'Used for one planting season only. Still strong suction. With hose.',
    attributes: { tool_type: 'Water pump', brand: 'Kaisar', power_w: 750, condition: USED } },
  { owner: 'toto.welding', category: 'power-tools', type: 'SELL', title: 'Angle grinder and drill, take all', price: 2400, unit: 'TOTAL', negotiable: true,
    municipality: 'Pila', daysAgo: 21,
    description: 'Both working, used in construction. Take all price. Extra discs included.',
    attributes: { tool_type: 'Power tools', brand: 'Bosch', power_w: 900, condition: USED } },

  // ---- Furniture ----
  { owner: 'tessie.b', category: 'furniture', type: 'SELL', title: 'Narra dining set, 6 seaters', price: 15000, unit: 'TOTAL', negotiable: true,
    municipality: 'Biñan', daysAgo: 10,
    description: 'Solid narra, inherited from my parents. Heavy and sturdy. Needs light refinishing. Buyer arranges pick-up.',
    attributes: { furniture_type: 'Dining set', material: 'Wood', condition: USED } },
  { owner: 'grace.l', category: 'furniture', type: 'SELL', title: 'Double deck bed with mattress', price: 6500, unit: 'TOTAL',
    municipality: 'San Pablo', daysAgo: 16,
    description: 'Metal frame double deck, good for a boarding house. Two mattresses included, still clean.',
    attributes: { furniture_type: 'Bed', material: 'Metal', condition: USED } },
  { owner: 'nene.sari', category: 'furniture', type: 'SELL', title: 'Rattan sofa set with cushions', price: 8000, unit: 'TOTAL', negotiable: true,
    municipality: 'Calauan', daysAgo: 20,
    description: 'Classic rattan set, three seater plus two chairs and a table. Cushions were re-covered last year.',
    attributes: { furniture_type: 'Sofa set', material: 'Rattan', condition: USED } },
  { owner: 'juan.santos', category: 'furniture', type: 'SELL', title: 'Office table and chair, home office', price: 3200, unit: 'TOTAL',
    municipality: 'Calamba', daysAgo: 29,
    description: 'Used for work from home. Table has one drawer, chair is adjustable. No damage.',
    attributes: { furniture_type: 'Office table', material: 'Wood', condition: USED } },

  // ---- Services: repair ----
  { owner: 'boyet.motors', category: 'repair', type: 'SERVICE', title: 'Motorcycle repair and tune-up, home service', price: 300, unit: 'PER_JOB',
    municipality: 'Los Baños', daysAgo: 7,
    description: 'Change oil, tune-up, electrical and brake work. Home service within Los Baños and Bay, or drop off at the shop near the public market. Parts are charged separately.',
    attributes: { specialty: 'Motorcycle', home_service: true }, images: ["repair.jpg"] },
  { owner: 'noel.aircon', category: 'repair', type: 'SERVICE', title: 'Aircon cleaning and repair, window or split', price: 700, unit: 'PER_JOB', negotiable: true,
    municipality: 'Cabuyao', daysAgo: 4,
    description: 'General cleaning for window type is ₱700, split type ₱1,200. Freon charging and repair also available. We cover Cabuyao, Calamba and Santa Rosa.',
    attributes: { specialty: 'Aircon', home_service: true } },
  { owner: 'jm.tech', category: 'repair', type: 'SERVICE', title: 'Cellphone repair, screen and charging port', price: null, unit: 'QUOTE',
    municipality: 'Santa Rosa', daysAgo: 12,
    description: 'Screen replacement, charging port, battery and software problems. Price depends on the model and parts — send me the model and a photo for a quote.',
    attributes: { specialty: 'Phone', home_service: false } },
  { owner: 'edgar.p', category: 'repair', type: 'SERVICE', title: 'Appliance repair — ref, washing machine, fan', price: 500, unit: 'PER_JOB',
    municipality: 'Santa Cruz', daysAgo: 19,
    description: 'Twenty years experience. Check-up fee ₱500, deducted from the total if you proceed with the repair. Home service around Santa Cruz and Pila.',
    attributes: { specialty: 'Appliance', home_service: true } },
  { owner: 'kap.tolits', category: 'repair', type: 'SERVICE', title: 'House wiring and electrical repair', price: null, unit: 'QUOTE',
    municipality: 'Pila', daysAgo: 24,
    description: 'Licensed electrician. New wiring, additional outlets, breaker problems and meter applications. Free estimate within Pila and Victoria.',
    attributes: { specialty: 'Electrical', home_service: true } },

  // ---- Services: construction ----
  { owner: 'toto.welding', category: 'construction', type: 'SERVICE', title: 'Welding works — grills, gates, railings', price: null, unit: 'QUOTE',
    municipality: 'Pila', daysAgo: 6,
    description: 'Window grills, gates, railings and steel trusses. Send the measurements for a quote. We fabricate in the shop and install on site.',
    attributes: { trade: 'Welder', crew_size: 3 } },
  { owner: 'kap.tolits', category: 'construction', type: 'SERVICE', title: 'Mason and finishing works, per day', price: 800, unit: 'PER_DAY',
    municipality: 'Pila', daysAgo: 11,
    description: 'Tile setting, plastering, concrete works. ₱800 per day per mason plus helper at ₱550. Minimum three days.',
    attributes: { trade: 'Mason', crew_size: 4 } },
  { owner: 'ferdie.c', category: 'construction', type: 'SERVICE', title: 'House painting, interior and exterior', price: null, unit: 'QUOTE',
    municipality: 'Calauan', daysAgo: 17,
    description: 'Painting for houses and small buildings. Labor only or with materials. Free estimate — send the floor area and how many coats you want.',
    attributes: { trade: 'Painter', crew_size: 3 } },
  { owner: 'benjie.r', category: 'construction', type: 'SERVICE', title: 'Carpentry — cabinets, doors, repairs', price: 750, unit: 'PER_DAY',
    municipality: 'Alaminos', daysAgo: 22,
    description: 'Built-in cabinets, doors, ceiling and general carpentry. Daily rate for labor, materials on your account.',
    attributes: { trade: 'Carpenter', crew_size: 2 } },

  // ---- Services: transport ----
  { owner: 'rico.hauling', category: 'transport-hauling', type: 'SERVICE', title: 'Lipat-bahay and hauling, closed van', price: null, unit: 'QUOTE',
    municipality: 'Calamba', daysAgo: 5,
    description: 'Closed van for moving house or delivering goods anywhere in Laguna and nearby provinces. Message for a quote — price depends on distance, volume and how many helpers you need.',
    attributes: { vehicle: 'Van', capacity_kg: 1500 } },
  { owner: 'dado.trike', category: 'transport-hauling', type: 'SERVICE', title: 'Tricycle delivery within Bay and Los Baños', price: 150, unit: 'PER_JOB', negotiable: true,
    municipality: 'Bay', daysAgo: 14,
    description: 'Small deliveries, palengke runs, or bringing goods to the terminal. ₱150 within Bay, ₱250 to Los Baños. Text or call, I answer faster on call.',
    attributes: { vehicle: 'Tricycle', capacity_kg: 200 } },
  { owner: 'ferdie.c', category: 'transport-hauling', type: 'SERVICE', title: 'Truck hauling — sand, gravel, hollow blocks', price: null, unit: 'QUOTE',
    municipality: 'Calauan', daysAgo: 20,
    description: 'Mini dump truck for construction materials. We can also source sand and gravel for you. Quote depends on the distance and volume.',
    attributes: { vehicle: 'Truck', capacity_kg: 4000 } },
  { owner: 'juan.santos', category: 'transport-hauling', type: 'SERVICE', title: 'Habal-habal ride, Calamba to nearby barangays', price: 80, unit: 'PER_JOB',
    municipality: 'Calamba', daysAgo: 26,
    description: 'For short trips where jeeps do not pass. Fixed rate within Calamba proper, farther barangays by agreement.',
    attributes: { vehicle: 'Habal-habal', capacity_kg: 120 } },

  // ---- Services: events and food ----
  { owner: 'lorna.catering', category: 'events-food', type: 'SERVICE', title: 'Catering for birthdays and weddings', price: 350, unit: 'PER_JOB', negotiable: true,
    municipality: 'Calamba', daysAgo: 2,
    description: 'Package starts at ₱350 per head for four dishes, rice and drinks. Includes tables, chairs and skirting. Fifty pax minimum. Book two weeks ahead for weekends.',
    attributes: { event_type: 'Catering', capacity_pax: 300 } },
  { owner: 'lorna.catering', category: 'events-food', type: 'SERVICE', title: 'Lechon baboy, whole, for orders', price: 8500, unit: 'PER_JOB',
    municipality: 'Calamba', daysAgo: 9,
    description: 'Whole lechon, around 30 to 35 kilos, good for 40 to 50 people. Order two days ahead. Delivery within Calamba is free.',
    attributes: { event_type: 'Lechon', capacity_pax: 50 } },
  { owner: 'mylene.s', category: 'events-food', type: 'SERVICE', title: 'Photo and video coverage for events', price: null, unit: 'QUOTE',
    municipality: 'Santa Rosa', daysAgo: 15,
    description: 'Birthdays, weddings, christenings and debut. Packages include edited photos and a highlight video. Message me for the rate card and available dates.',
    attributes: { event_type: 'Photo / video', capacity_pax: 200 } },
  { owner: 'nene.sari', category: 'events-food', type: 'SERVICE', title: 'Palabok and pancit trays for orders', price: 900, unit: 'PER_JOB',
    municipality: 'Calauan', daysAgo: 23,
    description: 'Large tray good for 15 to 20 persons. Palabok, pancit bihon or sotanghon. Order one day ahead. Pick up at the store.',
    attributes: { event_type: 'Catering', capacity_pax: 20 } },

  // ---- Farm and animals ----
  { owner: 'dely.farm', category: 'livestock', type: 'SELL', title: 'Native chickens, ready to lay', price: 450, unit: 'TOTAL', negotiable: true,
    municipality: 'Victoria', daysAgo: 4,
    description: 'Native hens, around six months old, ready to lay. ₱450 each, discount if you take five or more. Healthy and free range.',
    attributes: { animal: 'Chicken', breed: 'Native', quantity: 20 } },
  { owner: 'dely.farm', category: 'livestock', type: 'SELL', title: 'Goats for sale, male and female', price: 6500, unit: 'TOTAL', negotiable: true,
    municipality: 'Victoria', daysAgo: 12,
    description: 'Anglo-Nubian cross, healthy and dewormed. Price is per head depending on size. You can visit the farm to see them.',
    attributes: { animal: 'Goat', breed: 'Anglo-Nubian cross', quantity: 8 } },
  { owner: 'ferdie.c', category: 'livestock', type: 'SELL', title: 'Fattener pigs, around 90kg', price: 14000, unit: 'TOTAL',
    municipality: 'Calauan', daysAgo: 18,
    description: 'Ready for slaughter, around 90 to 100 kilos. Price per head. We can arrange delivery within Laguna for a fee.',
    attributes: { animal: 'Pig', breed: 'Landrace cross', quantity: 6 } },
  { owner: 'edgar.p', category: 'livestock', type: 'SELL', title: 'Itik ducks with eggs, take all', price: 3500, unit: 'TOTAL', negotiable: true,
    municipality: 'Santa Cruz', daysAgo: 25,
    description: 'Ten laying ducks, take all price. Good for balut or salted eggs business. Selling because I have no time to care for them.',
    attributes: { animal: 'Duck', breed: 'Itik', quantity: 10 } },
  { owner: 'dely.farm', category: 'farm-supplies', type: 'SELL', title: 'Hog feeds and chicken feeds, per sack', price: 1450, unit: 'TOTAL',
    municipality: 'Victoria', daysAgo: 6,
    description: 'Grower and finisher feeds, 50 kg per sack. Prices change weekly, message for the current rate. Delivery for five sacks and up.',
    attributes: { supply_type: 'Feeds' } },
  { owner: 'dely.farm', category: 'farm-supplies', type: 'SELL', title: 'Coconut and calamansi seedlings', price: 120, unit: 'TOTAL', negotiable: true,
    municipality: 'Victoria', daysAgo: 16,
    description: 'Healthy seedlings from our nursery. Calamansi at ₱120, coconut at ₱180. Bulk discount for 50 pieces and up.',
    attributes: { supply_type: 'Seedlings' } },
  { owner: 'kap.tolits', category: 'farm-supplies', type: 'SELL', title: 'Knapsack sprayer 16L, almost new', price: 1600, unit: 'TOTAL',
    municipality: 'Pila', daysAgo: 27,
    description: 'Manual knapsack sprayer, used twice. No leaks. Spare nozzle included.',
    attributes: { supply_type: 'Equipment' } },
]

/**
 * The trust graph: how much each viewer's TrustClub network vouches for each
 * poster. Directed, so it is written from the viewer's side.
 *
 * juan.santos is the demo account with the widest view — log in as him to see
 * ranking work across the whole board.
 */
export const DEMO_TRUST: Record<string, Record<string, number>> = {
  'juan.santos': {
    'ruben.dlc': 1240, 'marites.g': 860, 'boyet.motors': 640, 'lorna.catering': 520,
    'rico.hauling': 410, 'lito.reyes': 320, 'dado.trike': 260, 'noel.aircon': 210,
    'jm.tech': 180, 'toto.welding': 155, 'dely.farm': 120, 'weng.h': 95,
    'edgar.p': 70, 'nene.sari': 55, 'kap.tolits': 40, 'ana.cruz': 0,
    'benjie.r': 0, 'grace.l': 0, 'tessie.b': 0, 'mylene.s': 0,
  },
  'ana.cruz': {
    'jm.tech': 980, 'noel.aircon': 720, 'tessie.b': 540, 'mylene.s': 330,
    'juan.santos': 240, 'ruben.dlc': 180, 'marites.g': 90, 'weng.h': 45,
    'lorna.catering': 0, 'dely.farm': 0, 'toto.welding': 0,
  },
  'weng.h': {
    'marites.g': 1100, 'boyet.motors': 890, 'jhun.tutor': 610, 'juan.santos': 300,
    'lorna.catering': 205, 'ruben.dlc': 150, 'edgar.p': 60, 'ana.cruz': 0,
  },
  'kl-staff': {
    'ruben.dlc': 400, 'juan.santos': 380, 'marites.g': 350, 'jm.tech': 300,
    'lorna.catering': 260, 'dely.farm': 200,
  },
}
