import type { Category, GroupBuy, Marketplace, Product, Tier } from './types';

const img = (slug: string) => `https://picsum.photos/seed/${slug}/600/600`;

type SeedProduct = {
  slug: string;
  ru: string;
  kk: string;
  en: string;
  dRu: string;
  dKk: string;
  dEn: string;
  category: Category;
  marketplace: Marketplace;
  price: number;
  rating: number;
  orders: number;
};

export const SEED_PRODUCTS: SeedProduct[] = [
  // electronics
  { slug: 'wireless-earbuds', ru: 'Беспроводные наушники TWS Pro', kk: 'TWS Pro сымсыз құлаққабы', en: 'TWS Pro Wireless Earbuds', dRu: 'Шумоподавление, до 30 часов работы с кейсом, Bluetooth 5.3.', dKk: 'Шуды басу, кейспен 30 сағатқа дейін жұмыс, Bluetooth 5.3.', dEn: 'Noise cancellation, up to 30 hours with the case, Bluetooth 5.3.', category: 'electronics', marketplace: 'aliexpress', price: 19.99, rating: 4.7, orders: 45230 },
  { slug: 'smart-watch', ru: 'Смарт-часы Fit X8', kk: 'Fit X8 смарт-сағаты', en: 'Fit X8 Smart Watch', dRu: 'Пульс, сон, 100+ спортивных режимов, до 7 дней без зарядки.', dKk: 'Пульс, ұйқы, 100+ спорт режимі, зарядсыз 7 күнге дейін.', dEn: 'Heart rate, sleep tracking, 100+ sport modes, 7-day battery.', category: 'electronics', marketplace: 'temu', price: 32.5, rating: 4.5, orders: 28900 },
  { slug: 'power-bank-20000', ru: 'Пауэрбанк 20 000 мА·ч', kk: 'Пауэрбанк 20 000 мА·сағ', en: '20,000 mAh Power Bank', dRu: 'Быстрая зарядка 22.5 Вт, два USB-порта и Type-C.', dKk: 'Жылдам зарядтау 22.5 Вт, екі USB порты және Type-C.', dEn: '22.5W fast charging, dual USB ports and Type-C.', category: 'electronics', marketplace: 'aliexpress', price: 24.9, rating: 4.8, orders: 67400 },
  { slug: 'robot-vacuum', ru: 'Робот-пылесос SmartClean', kk: 'SmartClean робот-шаңсорғышы', en: 'SmartClean Robot Vacuum', dRu: 'Лидар-навигация, влажная уборка, управление со смартфона.', dKk: 'Лидар навигациясы, ылғалды тазалау, смартфоннан басқару.', dEn: 'Lidar navigation, mopping, smartphone control.', category: 'electronics', marketplace: 'amazon', price: 189, rating: 4.6, orders: 8200 },
  { slug: 'bt-speaker', ru: 'Bluetooth-колонка BoomGo', kk: 'BoomGo Bluetooth үндеткіші', en: 'BoomGo Bluetooth Speaker', dRu: 'Мощный бас, защита от воды IPX7, 24 часа музыки.', dKk: 'Қуатты бас, IPX7 суға төзімділік, 24 сағат музыка.', dEn: 'Punchy bass, IPX7 waterproof, 24 hours of playtime.', category: 'electronics', marketplace: 'temu', price: 27.8, rating: 4.4, orders: 19850 },
  { slug: 'action-camera', ru: 'Экшн-камера 4K UltraGo', kk: 'UltraGo 4K экшн-камерасы', en: 'UltraGo 4K Action Camera', dRu: 'Съёмка 4K/60fps, стабилизация, аквабокс в комплекте.', dKk: '4K/60fps түсірілім, тұрақтандыру, аквабокс жинақта.', dEn: '4K/60fps recording, stabilization, waterproof case included.', category: 'electronics', marketplace: 'aliexpress', price: 79, rating: 4.5, orders: 12300 },
  { slug: 'mini-projector', ru: 'Мини-проектор HomeCinema', kk: 'HomeCinema мини-проекторы', en: 'HomeCinema Mini Projector', dRu: 'Full HD, экран до 120", Wi-Fi и Bluetooth.', dKk: 'Full HD, 120" дейін экран, Wi-Fi және Bluetooth.', dEn: 'Full HD, up to 120" screen, Wi-Fi and Bluetooth.', category: 'electronics', marketplace: 'amazon', price: 95, rating: 4.3, orders: 5600 },
  { slug: 'phone-gimbal', ru: 'Стабилизатор для смартфона', kk: 'Смартфонға арналған стабилизатор', en: 'Smartphone Gimbal', dRu: 'Трёхосевая стабилизация, отслеживание лица, складной.', dKk: 'Үш осьті тұрақтандыру, бетті қадағалау, жиналмалы.', dEn: '3-axis stabilization, face tracking, foldable.', category: 'electronics', marketplace: 'aliexpress', price: 45, rating: 4.6, orders: 7800 },
  // fashion
  { slug: 'running-sneakers', ru: 'Кроссовки AirRun', kk: 'AirRun кроссовкасы', en: 'AirRun Sneakers', dRu: 'Лёгкие дышащие кроссовки с амортизирующей подошвой.', dKk: 'Жеңіл, ауа өткізетін, амортизациялық табаны бар кроссовка.', dEn: 'Lightweight breathable sneakers with cushioned sole.', category: 'fashion', marketplace: 'temu', price: 38, rating: 4.5, orders: 33100 },
  { slug: 'puffer-jacket', ru: 'Куртка-пуховик Urban', kk: 'Urban мамық күртешесі', en: 'Urban Puffer Jacket', dRu: 'Тёплый пуховик до −25°C, водоотталкивающая ткань.', dKk: '−25°C дейін жылы күртеше, су өткізбейтін мата.', dEn: 'Warm down jacket rated to −25°C, water-repellent fabric.', category: 'fashion', marketplace: 'aliexpress', price: 54, rating: 4.4, orders: 14500 },
  { slug: 'crossbody-bag', ru: 'Сумка кросс-боди', kk: 'Кросс-боди сөмкесі', en: 'Crossbody Bag', dRu: 'Компактная сумка из экокожи с регулируемым ремнём.', dKk: 'Реттелетін бауы бар экотеріден жасалған шағын сөмке.', dEn: 'Compact vegan-leather bag with adjustable strap.', category: 'fashion', marketplace: 'temu', price: 16.9, rating: 4.6, orders: 41200 },
  { slug: 'polar-sunglasses', ru: 'Очки поляризационные', kk: 'Поляризациялық көзілдірік', en: 'Polarized Sunglasses', dRu: 'Защита UV400, поляризационные линзы, унисекс.', dKk: 'UV400 қорғанысы, поляризациялық линзалар, унисекс.', dEn: 'UV400 protection, polarized lenses, unisex.', category: 'fashion', marketplace: 'aliexpress', price: 9.9, rating: 4.3, orders: 52600 },
  { slug: 'oversize-hoodie', ru: 'Худи оверсайз Basic', kk: 'Basic оверсайз худиі', en: 'Basic Oversize Hoodie', dRu: 'Плотный хлопок 360 г/м², мягкий начёс внутри.', dKk: 'Тығыз мақта 360 г/м², іші жұмсақ түкті.', dEn: 'Dense 360 g/m² cotton, soft fleece inside.', category: 'fashion', marketplace: 'temu', price: 21.5, rating: 4.7, orders: 26700 },
  { slug: 'silk-scarf', ru: 'Шёлковый платок', kk: 'Жібек орамал', en: 'Silk Scarf', dRu: 'Натуральный шёлк, 90×90 см, подарочная упаковка.', dKk: 'Табиғи жібек, 90×90 см, сыйлық қаптамасы.', dEn: 'Natural silk, 90×90 cm, gift packaging.', category: 'fashion', marketplace: 'aliexpress', price: 12.4, rating: 4.5, orders: 9300 },
  { slug: 'leather-belt', ru: 'Кожаный ремень Classic', kk: 'Classic былғары белдігі', en: 'Classic Leather Belt', dRu: 'Натуральная кожа, автоматическая пряжка.', dKk: 'Табиғи былғары, автоматты тоғасы.', dEn: 'Genuine leather with automatic buckle.', category: 'fashion', marketplace: 'amazon', price: 14, rating: 4.6, orders: 11800 },
  // home
  { slug: 'air-fryer', ru: 'Аэрогриль CrispyPro 5 л', kk: 'CrispyPro аэрогрилі 5 л', en: 'CrispyPro Air Fryer 5L', dRu: 'Готовка без масла, 8 программ, таймер и LED-дисплей.', dKk: 'Майсыз пісіру, 8 бағдарлама, таймер және LED дисплей.', dEn: 'Oil-free cooking, 8 programs, timer and LED display.', category: 'home', marketplace: 'amazon', price: 62, rating: 4.8, orders: 23400 },
  { slug: 'led-strip', ru: 'LED-лента RGB 10 м', kk: 'RGB LED жолағы 10 м', en: 'RGB LED Strip 10m', dRu: '16 млн цветов, управление с приложения, синхронизация с музыкой.', dKk: '16 млн түс, қосымшадан басқару, музыкамен синхрондау.', dEn: '16M colors, app control, music sync.', category: 'home', marketplace: 'aliexpress', price: 11.5, rating: 4.4, orders: 78900 },
  { slug: 'memory-pillow', ru: 'Подушка с эффектом памяти', kk: 'Жады эффектісі бар жастық', en: 'Memory Foam Pillow', dRu: 'Ортопедическая форма, гипоаллергенный чехол.', dKk: 'Ортопедиялық пішін, гипоаллергенді тыс.', dEn: 'Orthopedic shape, hypoallergenic cover.', category: 'home', marketplace: 'temu', price: 18.9, rating: 4.6, orders: 15600 },
  { slug: 'electric-kettle', ru: 'Электрочайник стеклянный', kk: 'Шыны электр шәйнегі', en: 'Glass Electric Kettle', dRu: '1.8 л, LED-подсветка, автоотключение.', dKk: '1.8 л, LED жарықтандыру, автоматты өшу.', dEn: '1.8L, LED light, auto shut-off.', category: 'home', marketplace: 'amazon', price: 25.4, rating: 4.5, orders: 9700 },
  { slug: 'aroma-diffuser', ru: 'Аромадиффузор ультразвуковой', kk: 'Ультрадыбыстық аромадиффузор', en: 'Ultrasonic Aroma Diffuser', dRu: '300 мл, 7 цветов подсветки, тихий режим для сна.', dKk: '300 мл, 7 түсті жарық, ұйқыға арналған тыныш режим.', dEn: '300ml, 7-color light, quiet sleep mode.', category: 'home', marketplace: 'aliexpress', price: 15.8, rating: 4.5, orders: 18200 },
  { slug: 'storage-organizer', ru: 'Органайзеры для хранения, 6 шт', kk: 'Сақтау органайзері, 6 дана', en: 'Storage Organizers, 6 pcs', dRu: 'Складные коробы для одежды и белья.', dKk: 'Киім мен төсек-орынға арналған жиналмалы қораптар.', dEn: 'Foldable boxes for clothes and linen.', category: 'home', marketplace: 'temu', price: 13.2, rating: 4.3, orders: 31500 },
  { slug: 'fleece-blanket', ru: 'Плед флисовый 200×220', kk: 'Флис жамылғысы 200×220', en: 'Fleece Blanket 200×220', dRu: 'Мягкий двусторонний флис, не электризуется.', dKk: 'Жұмсақ екі жақты флис, электрленбейді.', dEn: 'Soft double-sided fleece, anti-static.', category: 'home', marketplace: 'aliexpress', price: 17.6, rating: 4.7, orders: 12900 },
  // beauty
  { slug: 'hair-dryer-brush', ru: 'Фен-щётка StylePro 5-в-1', kk: 'StylePro фен-қылшағы 5-і 1-де', en: 'StylePro 5-in-1 Hair Dryer Brush', dRu: 'Сушка, укладка и объём, 5 насадок, ионизация.', dKk: 'Кептіру, сәндеу және көлем, 5 саптама, иондау.', dEn: 'Dry, style and volumize, 5 attachments, ionic care.', category: 'beauty', marketplace: 'aliexpress', price: 34.9, rating: 4.5, orders: 38700 },
  { slug: 'led-face-mask', ru: 'LED-маска для лица', kk: 'Бетке арналған LED-маска', en: 'LED Face Mask', dRu: '7 режимов светотерапии для ухода за кожей.', dKk: 'Тері күтіміне арналған 7 жарық терапиясы режимі.', dEn: '7 light-therapy modes for skincare.', category: 'beauty', marketplace: 'amazon', price: 49, rating: 4.2, orders: 4300 },
  { slug: 'perfume-set', ru: 'Набор мини-парфюмов, 5 шт', kk: 'Мини-парфюм жинағы, 5 дана', en: 'Mini Perfume Set, 5 pcs', dRu: 'Пять ароматов по 10 мл в подарочной коробке.', dKk: 'Сыйлық қорабындағы 10 мл бес хош иіс.', dEn: 'Five 10ml scents in a gift box.', category: 'beauty', marketplace: 'temu', price: 22, rating: 4.4, orders: 17800 },
  { slug: 'skincare-set', ru: 'Набор уходовой косметики', kk: 'Күтім косметикасы жинағы', en: 'Skincare Set', dRu: 'Очищение, тонер, сыворотка и крем — полный уход.', dKk: 'Тазарту, тонер, сарысу және крем — толық күтім.', dEn: 'Cleanser, toner, serum and cream — a full routine.', category: 'beauty', marketplace: 'aliexpress', price: 28.5, rating: 4.6, orders: 21900 },
  { slug: 'nail-lamp-kit', ru: 'Лампа для маникюра + гель-лаки', kk: 'Маникюр шамы + гель-лактар', en: 'Nail Lamp + Gel Polish Kit', dRu: 'UV/LED-лампа 86 Вт и набор из 12 гель-лаков.', dKk: '86 Вт UV/LED шам және 12 гель-лак жинағы.', dEn: '86W UV/LED lamp with a set of 12 gel polishes.', category: 'beauty', marketplace: 'temu', price: 26.7, rating: 4.5, orders: 14100 },
  { slug: 'jade-roller', ru: 'Роллер для лица из нефрита', kk: 'Нефриттен жасалған бет роллері', en: 'Jade Face Roller', dRu: 'Натуральный камень, снимает отёчность, в комплекте гуаша.', dKk: 'Табиғи тас, ісінуді басады, жинақта гуаша.', dEn: 'Natural stone, reduces puffiness, gua sha included.', category: 'beauty', marketplace: 'aliexpress', price: 7.9, rating: 4.3, orders: 25800 },
  { slug: 'electric-cleanser', ru: 'Щётка для умывания', kk: 'Бет жууға арналған қылшақ', en: 'Facial Cleansing Brush', dRu: 'Силиконовая, водонепроницаемая, 5 режимов вибрации.', dKk: 'Силиконды, су өткізбейді, 5 діріл режимі.', dEn: 'Silicone, waterproof, 5 vibration modes.', category: 'beauty', marketplace: 'temu', price: 12.3, rating: 4.4, orders: 9800 },
  // sports
  { slug: 'yoga-mat', ru: 'Коврик для йоги 6 мм', kk: 'Йога төсеніші 6 мм', en: 'Yoga Mat 6mm', dRu: 'Нескользящее покрытие, ремешок для переноски.', dKk: 'Сырғымайтын беті, тасымалдау бауы.', dEn: 'Non-slip surface, carrying strap.', category: 'sports', marketplace: 'temu', price: 13.9, rating: 4.6, orders: 29400 },
  { slug: 'dumbbells-set', ru: 'Разборные гантели 2×10 кг', kk: 'Құрастырмалы гантельдер 2×10 кг', en: 'Adjustable Dumbbells 2×10 kg', dRu: 'Регулируемый вес, соединяются в штангу.', dKk: 'Реттелетін салмақ, штангаға біріктіріледі.', dEn: 'Adjustable weight, converts to a barbell.', category: 'sports', marketplace: 'amazon', price: 58, rating: 4.7, orders: 6900 },
  { slug: 'massage-gun', ru: 'Массажный пистолет Relax', kk: 'Relax массаж пистолеті', en: 'Relax Massage Gun', dRu: '6 насадок, 30 скоростей, тихий мотор.', dKk: '6 саптама, 30 жылдамдық, тыныш мотор.', dEn: '6 heads, 30 speeds, quiet motor.', category: 'sports', marketplace: 'aliexpress', price: 36.5, rating: 4.5, orders: 22600 },
  { slug: 'resistance-bands', ru: 'Набор фитнес-резинок', kk: 'Фитнес-резеңкелер жинағы', en: 'Resistance Bands Set', dRu: '5 уровней сопротивления, чехол в комплекте.', dKk: '5 кедергі деңгейі, қапшығы жинақта.', dEn: '5 resistance levels, pouch included.', category: 'sports', marketplace: 'temu', price: 8.9, rating: 4.5, orders: 47300 },
  { slug: 'thermo-bottle', ru: 'Термобутылка 1 л', kk: 'Термобөтелке 1 л', en: 'Thermo Bottle 1L', dRu: 'Держит тепло 12 часов, холод — 24 часа.', dKk: 'Жылуды 12 сағат, суықты 24 сағат сақтайды.', dEn: 'Keeps drinks hot for 12h, cold for 24h.', category: 'sports', marketplace: 'aliexpress', price: 11.2, rating: 4.6, orders: 35200 },
  { slug: 'running-backpack', ru: 'Рюкзак спортивный 25 л', kk: 'Спорттық рюкзак 25 л', en: 'Sports Backpack 25L', dRu: 'Отделение для обуви, влагозащита, светоотражатели.', dKk: 'Аяқ киім бөлімі, ылғалдан қорғау, шағылыстырғыштар.', dEn: 'Shoe compartment, water-resistant, reflective details.', category: 'sports', marketplace: 'temu', price: 19.8, rating: 4.4, orders: 13700 },
  { slug: 'jump-rope-smart', ru: 'Умная скакалка со счётчиком', kk: 'Санағышы бар смарт секіртпе', en: 'Smart Jump Rope with Counter', dRu: 'Счётчик прыжков и калорий, регулируемая длина.', dKk: 'Секіру мен калория санағышы, реттелетін ұзындық.', dEn: 'Jump and calorie counter, adjustable length.', category: 'sports', marketplace: 'aliexpress', price: 10.5, rating: 4.3, orders: 16400 },
];

export const MOCK_PRODUCTS: Product[] = SEED_PRODUCTS.map((p) => ({
  id: p.slug,
  slug: p.slug,
  title: { ru: p.ru, kk: p.kk, en: p.en },
  description: { ru: p.dRu, kk: p.dKk, en: p.dEn },
  category: p.category,
  marketplace: p.marketplace,
  price_usd: p.price,
  rating: p.rating,
  orders_count: p.orders,
  image_url: img(p.slug),
}));

export const DEFAULT_TIERS: Tier[] = [
  { min_qty: 1, discount_pct: 0 },
  { min_qty: 10, discount_pct: 15 },
  { min_qty: 50, discount_pct: 30 },
];

const h = 3600_000;
const now = Date.now();

type SeedGroup = {
  slug: string;
  participants: number;
  deadlineMs: number;
  status?: 'active' | 'expired';
  tiers?: Tier[];
};

// wireless-earbuds seeded at 9/10 on purpose: one live join on stage crosses the
// tier boundary and the price visibly drops
export const SEED_GROUPS: SeedGroup[] = [
  { slug: 'wireless-earbuds', participants: 9, deadlineMs: now + 26 * h },
  { slug: 'smart-watch', participants: 23, deadlineMs: now + 6 * h },
  { slug: 'power-bank-20000', participants: 41, deadlineMs: now + 14 * h },
  { slug: 'robot-vacuum', participants: 12, deadlineMs: now + 3 * 24 * h },
  { slug: 'running-sneakers', participants: 18, deadlineMs: now + 30 * h },
  { slug: 'crossbody-bag', participants: 35, deadlineMs: now + 9 * h },
  { slug: 'air-fryer', participants: 27, deadlineMs: now + 2 * 24 * h },
  { slug: 'led-strip', participants: 44, deadlineMs: now + 5 * h },
  { slug: 'hair-dryer-brush', participants: 31, deadlineMs: now + 20 * h },
  { slug: 'yoga-mat', participants: 15, deadlineMs: now + 28 * h },
  { slug: 'massage-gun', participants: 8, deadlineMs: now + 40 * h },
  { slug: 'polar-sunglasses', participants: 37, deadlineMs: now - 2 * h, status: 'expired' },
];

export const MOCK_GROUP_BUYS: GroupBuy[] = SEED_GROUPS.map((g) => ({
  id: `gb-${g.slug}`,
  product_id: g.slug,
  tiers: g.tiers ?? DEFAULT_TIERS,
  target_qty: 50,
  participants_count: g.participants,
  deadline: new Date(g.deadlineMs).toISOString(),
  status: g.status ?? 'active',
  product: MOCK_PRODUCTS.find((p) => p.id === g.slug),
}));
