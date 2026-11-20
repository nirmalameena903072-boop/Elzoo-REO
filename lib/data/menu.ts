import type { Diet, Station } from "@/lib/db/schema";

export type SeedCategory = { id: string; name: string; sort: number };

export type SeedItem = {
  id: string;
  categoryId: string;
  name: string;
  nameHi: string;
  slug: string;
  description: string;
  price: number; // rupees, converted to paise at seed time
  diet: Diet;
  spice: 0 | 1 | 2 | 3;
  allergens: string[];
  prepMinutes: number;
  station: Station;
  sort: number;
  image?: string;
  available?: boolean;
  /** Shown with a chef's-pick mark on the diner menu. */
  pinned?: boolean;
};

export const CATEGORIES: SeedCategory[] = [
  { id: "cat_small", name: "Small Plates", sort: 1 },
  { id: "cat_tandoor", name: "Tandoor", sort: 2 },
  { id: "cat_mains", name: "Mains", sort: 3 },
  { id: "cat_breads", name: "Breads & Rice", sort: 4 },
  { id: "cat_dessert", name: "Desserts", sort: 5 },
  { id: "cat_drinks", name: "Drinks", sort: 6 },
];

export const ITEMS: SeedItem[] = [
  {
    id: "itm_dahi_kebab", categoryId: "cat_small", name: "Dahi Ke Kebab", nameHi: "दही के कबाब",
    slug: "dahi-ke-kebab", price: 290, diet: "VEG", spice: 1, allergens: ["Dairy", "Gluten"], prepMinutes: 12,
    station: "TANDOOR", sort: 1,
    description: "Hung curd set overnight in muslin, crumb-fried soft. Cracks open, never crumbles.",
  },
  {
    id: "itm_paneer_tikka", categoryId: "cat_small", name: "Paneer Tikka", nameHi: "पनीर टिक्का", pinned: true,
    slug: "paneer-tikka", price: 320, diet: "VEG", spice: 2, allergens: ["Dairy"], prepMinutes: 14,
    station: "TANDOOR", sort: 2,
    description: "Hand-cut paneer charred on the skewer, dusted with kachri and ajwain.",
  },
  {
    id: "itm_spring_roll", categoryId: "cat_small", name: "Veg Spring Roll", nameHi: "वेज स्प्रिंग रोल",
    slug: "veg-spring-roll", price: 240, diet: "VEG", spice: 1, allergens: ["Gluten", "Soy"], prepMinutes: 10,
    station: "CHINESE", sort: 3,
    description: "Thin pastry, cabbage and glass noodle, fried till the shell shatters.",
  },
  {
    id: "itm_galouti", categoryId: "cat_small", name: "Mushroom Galouti", nameHi: "मशरूम गलौटी",
    slug: "mushroom-galouti", price: 340, diet: "VEG", spice: 1, allergens: ["Dairy", "Nuts"], prepMinutes: 12,
    station: "TANDOOR", sort: 4,
    description: "Button mushrooms minced fine, smoked with a ghee-dipped coal under cover.",
  },
  {
    id: "itm_chicken_malai", categoryId: "cat_small", name: "Chicken Malai Tikka", nameHi: "चिकन मलाई टिक्का",
    slug: "chicken-malai-tikka", price: 380, diet: "NONVEG", spice: 0, allergens: ["Dairy"], prepMinutes: 16,
    station: "TANDOOR", sort: 5,
    description: "Cream and cheddar marinade left 24 hours, then one short sharp char.",
  },
  {
    id: "itm_fish_amritsari", categoryId: "cat_small", name: "Fish Amritsari", nameHi: "फिश अमृतसरी",
    slug: "fish-amritsari", price: 420, diet: "NONVEG", spice: 2, allergens: ["Fish", "Gluten"], prepMinutes: 15,
    station: "CHINESE", sort: 6,
    description: "Basa in an ajwain-besan batter, fried in desi ghee. Mint chutney on the side.",
  },
  {
    id: "itm_tandoori_aloo", categoryId: "cat_tandoor", name: "Tandoori Aloo", nameHi: "तंदूरी आलू",
    slug: "tandoori-aloo", price: 260, diet: "VEG", spice: 2, allergens: ["Dairy"], prepMinutes: 14,
    station: "TANDOOR", sort: 1,
    description: "Baby potatoes scored deep, hung curd and Kashmiri chilli, smoked in clay.",
  },
  {
    id: "itm_paneer_malai", categoryId: "cat_tandoor", name: "Paneer Malai Tikka", nameHi: "पनीर मलाई टिक्का",
    slug: "paneer-malai-tikka", price: 350, diet: "VEG", spice: 0, allergens: ["Dairy"], prepMinutes: 14,
    station: "TANDOOR", sort: 2,
    description: "The mild one. Cream marinade, no chilli heat, finished with kewra butter.",
  },
  {
    id: "itm_tandoori_chicken", categoryId: "cat_tandoor", name: "Tandoori Chicken (Half)", nameHi: "तंदूरी चिकन (हाफ)",
    slug: "tandoori-chicken-half", price: 390, diet: "NONVEG", spice: 2, allergens: ["Dairy"], prepMinutes: 22,
    station: "TANDOOR", sort: 3,
    description: "Overnight yoghurt cure, cooked on the bone at four hundred degrees. Half bird.",
  },
  {
    id: "itm_seekh", categoryId: "cat_tandoor", name: "Mutton Seekh Kebab", nameHi: "मटन सीख कबाब",
    slug: "mutton-seekh-kebab", price: 460, diet: "NONVEG", spice: 2, allergens: [], prepMinutes: 20,
    station: "TANDOOR", sort: 4,
    description: "Hand-minced mutton, fat from the tail, no binder. Four pieces to a plate.",
  },
  {
    id: "itm_dal_makhani", categoryId: "cat_mains", name: "Dal Makhani", nameHi: "दाल मखानी", pinned: true,
    slug: "dal-makhani", price: 280, diet: "VEG", spice: 1, allergens: ["Dairy"], prepMinutes: 18,
    station: "CURRY", sort: 1,
    description: "Urad on a low flame for eight hours, finished with a knob of white butter.",
  },
  {
    id: "itm_malai_kofta", categoryId: "cat_mains", name: "Malai Kofta", nameHi: "मलाई कोफ्ता",
    slug: "malai-kofta", price: 330, diet: "VEG", spice: 0, allergens: ["Dairy", "Nuts", "Gluten"], prepMinutes: 16,
    station: "CURRY", sort: 2,
    description: "Paneer and khoya dumplings in a cashew gravy, no onion in the base.",
  },
  {
    id: "itm_paneer_butter", categoryId: "cat_mains", name: "Paneer Butter Masala", nameHi: "पनीर बटर मसाला",
    slug: "paneer-butter-masala", price: 340, diet: "VEG", spice: 1, allergens: ["Dairy", "Nuts"], prepMinutes: 15,
    station: "CURRY", sort: 3,
    description: "Slow tomato base with a spoon of kasundi. Sharp first, faintly sweet after.",
  },
  {
    id: "itm_kadhai_mushroom", categoryId: "cat_mains", name: "Kadhai Mushroom", nameHi: "कढ़ाई मशरूम",
    slug: "kadhai-mushroom", price: 320, diet: "VEG", spice: 3, allergens: [], prepMinutes: 14,
    station: "CURRY", sort: 4,
    description: "Button mushrooms tossed in crushed coriander seed and whole dry chilli.",
  },
  {
    id: "itm_butter_chicken", categoryId: "cat_mains", name: "Butter Chicken", nameHi: "बटर चिकन",
    slug: "butter-chicken", price: 420, diet: "NONVEG", spice: 1, allergens: ["Dairy", "Nuts"], prepMinutes: 18,
    station: "CURRY", sort: 5,
    description: "Tandoor-charred thigh in tomato-butter gravy, a swirl of cream on top.",
  },
  {
    id: "itm_laal_maas", categoryId: "cat_mains", name: "Laal Maas", nameHi: "लाल माँस",
    slug: "laal-maas", price: 520, diet: "NONVEG", spice: 3, allergens: ["Dairy"], prepMinutes: 24,
    station: "CURRY", sort: 6,
    description: "Rajasthani mutton in mathania chilli and a lot of garlic. Order it hot.",
  },
  {
    id: "itm_roti", categoryId: "cat_breads", name: "Tandoori Roti", nameHi: "तंदूरी रोटी",
    slug: "tandoori-roti", price: 40, diet: "VEG", spice: 0, allergens: ["Gluten"], prepMinutes: 4,
    station: "TANDOOR", sort: 1,
    description: "Whole wheat slapped thin, a minute against the tandoor wall.",
  },
  {
    id: "itm_naan", categoryId: "cat_breads", name: "Butter Naan", nameHi: "बटर नान",
    slug: "butter-naan", price: 60, diet: "VEG", spice: 0, allergens: ["Gluten", "Dairy"], prepMinutes: 5,
    station: "TANDOOR", sort: 2,
    description: "Yoghurt-soft maida, pulled out early and brushed with butter at the pass.",
  },
  {
    id: "itm_laccha", categoryId: "cat_breads", name: "Laccha Paratha", nameHi: "लच्छा पराठा",
    slug: "laccha-paratha", price: 70, diet: "VEG", spice: 0, allergens: ["Gluten", "Dairy"], prepMinutes: 6,
    station: "TANDOOR", sort: 3,
    description: "Folded in coils, flaked apart at the table. Meant to be eaten with dal.",
  },
  {
    id: "itm_jeera_rice", categoryId: "cat_breads", name: "Jeera Rice", nameHi: "जीरा राइस",
    slug: "jeera-rice", price: 180, diet: "VEG", spice: 0, allergens: [], prepMinutes: 10,
    station: "CURRY", sort: 4,
    description: "Basmati tempered with jeera in ghee and nothing else. Long grains, separate.",
  },
  {
    id: "itm_pulao", categoryId: "cat_breads", name: "Saffron Pulao", nameHi: "केसर पुलाव",
    slug: "saffron-pulao", price: 220, diet: "VEG", spice: 0, allergens: ["Nuts"], prepMinutes: 12,
    station: "CURRY", sort: 5,
    description: "Basmati with a pinch of Kashmiri saffron, fried onion and cashew on top.",
  },
  {
    id: "itm_biryani", categoryId: "cat_breads", name: "Chicken Biryani", nameHi: "चिकन बिरयानी",
    slug: "chicken-biryani", price: 380, diet: "NONVEG", spice: 2, allergens: ["Dairy"], prepMinutes: 20,
    station: "CURRY", sort: 6,
    description: "Lucknowi dum style in a sealed handi. Thin rice, no food colour, no shortcuts.",
  },
  {
    id: "itm_gulab_jamun", categoryId: "cat_dessert", name: "Gulab Jamun (2 pc)", nameHi: "गुलाब जामुन (2)", pinned: true,
    slug: "gulab-jamun", price: 150, diet: "VEG", spice: 0, allergens: ["Dairy", "Gluten"], prepMinutes: 5,
    station: "DESSERT", sort: 1,
    description: "Milk-solid jamuns fried to deep amber, sitting in cardamom syrup.",
  },
  {
    id: "itm_shahi_tukda", categoryId: "cat_dessert", name: "Shahi Tukda", nameHi: "शाही टुकड़ा",
    slug: "shahi-tukda", price: 180, diet: "VEG", spice: 0, allergens: ["Dairy", "Gluten", "Nuts"], prepMinutes: 7,
    station: "DESSERT", sort: 2,
    description: "Fried bread soaked in rabri, pistachio and silver leaf. Served warm.",
  },
  {
    id: "itm_chai", categoryId: "cat_drinks", name: "Masala Chai", nameHi: "मसाला चाय",
    slug: "masala-chai", price: 80, diet: "VEG", spice: 0, allergens: ["Dairy"], prepMinutes: 4,
    station: "BAR", sort: 1,
    description: "Adrak and green cardamom boiled hard, poured into a clay kulhad.",
  },
  {
    id: "itm_lassi", categoryId: "cat_drinks", name: "Sweet Lassi", nameHi: "स्वीट लस्सी",
    slug: "sweet-lassi", price: 120, diet: "VEG", spice: 0, allergens: ["Dairy"], prepMinutes: 3,
    station: "BAR", sort: 2,
    description: "Thick set curd whisked by hand, sugar and one drop of rose water.",
  },
  {
    id: "itm_nimbu_soda", categoryId: "cat_drinks", name: "Nimbu Pudina Soda", nameHi: "नींबू पुदीना सोडा",
    slug: "nimbu-pudina-soda", price: 90, diet: "VEG", spice: 0, allergens: [], prepMinutes: 3,
    station: "BAR", sort: 3,
    description: "Fresh lime and muddled mint over soda, a pinch of black salt.",
  },
];

export const HERO_SLUGS = ["butter-chicken", "dal-makhani", "paneer-tikka", "chicken-biryani", "shahi-tukda"];
