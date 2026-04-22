/** City landing SEO: slug → display name + intro (UK-focused, organic search). */
export const CITY_SLUGS = [
  "manchester",
  "london",
  "birmingham",
  "leeds",
  "leicester",
  "bradford",
  "bristol",
  "liverpool",
  "sheffield",
  "nottingham",
];

export const CITY_COPY = {
  manchester: {
    display: "Manchester",
    title: "African, Caribbean & Asian Stores in Manchester UK | Clip Services",
    description:
      "Shop African, Caribbean and Asian independent stores in Greater Manchester. Groceries, hair & beauty, halal, fashion — secure checkout on Clip Services.",
    intro: `Manchester has one of the UK’s richest African, Caribbean and Asian high streets — from Longsight and Rusholme to Cheetham Hill and beyond. Clip Services helps you find independent grocers, salons, fabric sellers and market traders online: order for collection or delivery where sellers offer it, with Stripe-secure payments and WhatsApp updates.`,
  },
  london: {
    display: "London",
    title: "African, Caribbean & Asian Stores in London | Clip Services",
    description:
      "Discover African, Caribbean and Asian independent shops across London. Food, beauty, fashion and halal — order online on Clip Services.",
    intro: `London’s diaspora communities span every borough — from Brixton and Peckham to Southall, Green Street and Wembley. Clip Services brings together independent African, Caribbean and Asian stores and stalls so you can browse authentic products, support local traders, and checkout securely without hunting through dozens of apps.`,
  },
  birmingham: {
    display: "Birmingham",
    title: "African, Caribbean & Asian Stores in Birmingham | Clip Services",
    description:
      "Order from African, Caribbean and Asian shops in Birmingham. Spices, halal meat, hair and beauty — Clip Services UK marketplace.",
    intro: `Birmingham’s African Caribbean quarter and busy Asian retail streets make it a natural home for community-first shopping. Whether you’re in the Jewellery Quarter, Sparkbrook or the suburbs, Clip Services lists independent sellers you can trust — with clear product info and card payments.`,
  },
  leeds: {
    display: "Leeds",
    title: "African, Caribbean & Asian Stores in Leeds | Clip Services",
    description:
      "Find African, Caribbean and Asian independent stores serving Leeds and West Yorkshire. Shop online on Clip Services.",
    intro: `From Chapeltown to Harehills and the city centre, Leeds has long supported vibrant African Caribbean and South Asian retail. Clip Services helps locals and students discover grocers, takeaways-as-retail, and beauty suppliers — all in one marketplace.`,
  },
  leicester: {
    display: "Leicester",
    title: "African, Caribbean & Asian Stores in Leicester | Clip Services",
    description:
      "African, Caribbean and Asian groceries and goods in Leicester — independent stores on Clip Services UK.",
    intro: `Leicester’s Melton Road and surrounding areas are known for South Asian groceries, while African and Caribbean communities add depth across the city. Use Clip Services to find independent sellers, compare what’s in stock, and order online where available.`,
  },
  bradford: {
    display: "Bradford",
    title: "African, Caribbean & Asian Stores in Bradford | Clip Services",
    description:
      "Shop African, Caribbean and Asian independent stores in Bradford. Authentic ingredients and more on Clip Services.",
    intro: `Bradford’s Asian wholesale and retail heritage sits alongside growing African and Caribbean communities. Clip Services connects you with local independents — ideal for bulk spices, halal products, fabrics and community-trusted brands.`,
  },
  bristol: {
    display: "Bristol",
    title: "African, Caribbean & Asian Stores in Bristol | Clip Services",
    description:
      "African, Caribbean and Asian shops in Bristol — order from independents on Clip Services.",
    intro: `From St Pauls and Easton to Gloucester Road, Bristol’s independent scene is community-led. Clip Services helps you support African, Caribbean and Asian traders with a single checkout experience and clear store profiles.`,
  },
  liverpool: {
    display: "Liverpool",
    title: "African, Caribbean & Asian Stores in Liverpool | Clip Services",
    description:
      "Find African, Caribbean and Asian stores in Liverpool and Merseyside on Clip Services UK marketplace.",
    intro: `Liverpool’s diverse neighbourhoods include longstanding Caribbean and growing African and Asian retail. Browse Clip Services for independents listing groceries, beauty, fashion and more — with secure payments.`,
  },
  sheffield: {
    display: "Sheffield",
    title: "African, Caribbean & Asian Stores in Sheffield | Clip Services",
    description:
      "African, Caribbean and Asian independent shops in Sheffield — shop online via Clip Services.",
    intro: `Sheffield’s communities are spread across the city and campuses. Clip Services makes it easier to find African, Caribbean and Asian independents, whether you need weekly groceries, specialist ingredients or hair and beauty products.`,
  },
  nottingham: {
    display: "Nottingham",
    title: "African, Caribbean & Asian Stores in Nottingham | Clip Services",
    description:
      "Order from African, Caribbean and Asian stores in Nottingham — Clip Services UK marketplace.",
    intro: `Nottingham’s independent retailers serve students and families alike. Clip Services highlights African, Caribbean and Asian sellers so you can discover new stores, read what they offer, and order online in a few clicks.`,
  },
};

/** Canonical category URLs — programmatic SEO landing pages. */
export const CATEGORY_SLUGS = [
  "fresh-produce",
  "meat-and-fish",
  "rice-grains-flour",
  "spices-ingredients",
  "hair-beauty",
  "fashion-fabrics",
  "drinks-beverages",
  "halal-products",
  "ready-meals",
  "snacks-sweets",
];

/** Old URLs → canonical (use 301 in category-html). */
export const CATEGORY_SLUG_ALIASES = {
  halal: "halal-products",
  "fashion-fabric": "fashion-fabrics",
  "spices-staples": "spices-ingredients",
  drinks: "drinks-beverages",
};

export const CATEGORY_COPY = {
  "fresh-produce": {
    title: "Buy Fresh Produce Online UK — African & Caribbean | Clip Services",
    description:
      "Order fresh African and Caribbean fruit, vegetables and produce from UK independents. Plantain, yam, okra — secure Stripe checkout.",
    h1: "Buy fresh African & Caribbean produce online UK",
    intro: `Find plantain, yams, okra, scotch bonnet, callaloo, sweet potato and seasonal greens from independent grocers who stock what diaspora kitchens need. Clip Services lists trusted African, Caribbean and Asian stores across the UK: browse each shop’s line, pay securely by card, and choose collection or local delivery where the seller offers it. Whether you’re cooking midweek meals or preparing for celebrations, supporting independents keeps money in community businesses.`,
    keywords: ["produce", "fresh", "vegetables", "fruit", "plantain", "yam", "greens", "okra"],
  },
  "meat-and-fish": {
    title: "Buy Halal Meat & Fish Online UK | African & Caribbean Stores | Clip Services",
    description:
      "Halal meat, fish and poultry from UK African, Caribbean and Asian independent stores. Order online — Clip Services marketplace.",
    h1: "Meat & fish from community stores online",
    intro: `Shop halal meat, goat, chicken, fish and cuts your recipe calls for — listed by independents who serve African, Caribbean and Asian customers. Clip Services brings together local grocers and market traders so you can compare what’s in stock, read store profiles, and checkout with Stripe. Availability and delivery radius are set by each seller; many offer collection or same-day pickup.`,
    keywords: ["meat", "fish", "halal", "chicken", "goat", "seafood", "butcher"],
  },
  "rice-grains-flour": {
    title: "Rice, Grains & Flour Online UK — African & Asian Grocery | Clip Services",
    description:
      "Basmati, jasmine, fufu flour, semolina and pantry grains from UK independents. Shop Clip Services.",
    h1: "Rice, grains & flour — UK independents",
    intro: `Stock your pantry with rice, beans, flour and grains for West African, Caribbean and South Asian cooking. Independent stores on Clip Services list fufu flour, gari, atta, basmati and more — with clear pricing and secure payment. Order online and collect or receive delivery where available.`,
    keywords: ["rice", "flour", "grains", "fufu", "semolina", "beans"],
  },
  "spices-ingredients": {
    title: "African & Asian Spices & Ingredients Online UK | Clip Services",
    description:
      "Spices, seasonings, oils and cooking ingredients from UK community grocers — Clip Services.",
    h1: "Spices & cooking ingredients online",
    intro: `From suya spice and jerk seasoning to curry leaves and palm oil, community stores stock the ingredients that make home cooking taste right. Clip Services helps you find independents listing spices, sauces, dried fish and speciality items — pay online and support local traders.`,
    keywords: ["spices", "seasoning", "oil", "sauce", "ingredients", "curry"],
  },
  "hair-beauty": {
    title: "African & Caribbean Hair & Beauty Products UK | Clip Services",
    description:
      "Afro hair care, braiding supplies, beauty and cosmetics from UK independents — shop online.",
    h1: "Hair & beauty from African & Caribbean stores",
    intro: `Find independent sellers stocking products for textured hair, braids, wigs and skin care trusted in diaspora communities. Clip Services connects you with local beauty supply shops and salons that retail online — browse, order and pay securely.`,
    keywords: ["hair", "beauty", "cosmetics", "braids", "extensions", "afro"],
  },
  "fashion-fabrics": {
    title: "African & Asian Fashion & Ankara Fabric Online UK | Clip Services",
    description:
      "Fabrics, ankara, cultural fashion and accessories from UK independent stores — Clip Services.",
    h1: "Fashion & fabrics online UK",
    intro: `Discover independents selling ankara, lace, ready-to-wear and accessories for weddings, church and everyday style. Clip Services lists African, Caribbean and Asian retailers so you can shop online with Stripe and support local businesses.`,
    keywords: ["fashion", "fabric", "ankara", "lace", "clothing"],
  },
  "drinks-beverages": {
    title: "African & Caribbean Drinks & Beverages UK | Clip Services",
    description:
      "Juices, malt drinks, soft drinks and speciality beverages from UK independents — order online.",
    h1: "Drinks & beverages from community stores",
    intro: `Shop juices, malt beverages, mixers and drinks from diaspora-led independents. Clip Services makes it easy to add beverages to your basket with other groceries — one checkout, secure payments.`,
    keywords: ["drinks", "juice", "beverages", "malt", "soft drink"],
  },
  "halal-products": {
    title: "Halal Groceries & Products Online UK | Clip Services",
    description:
      "Halal-certified groceries, snacks and household lines from African & Asian UK stores — Clip Services.",
    h1: "Halal products from trusted independents",
    intro: `Browse halal-suitable and certified lines from community retailers you can trust. From snacks and spices to meat where listed — Clip Services lists independent African and Asian stores with Stripe checkout and clear store information.`,
    keywords: ["halal", "meat", "groceries", "certified", "islamic"],
  },
  "ready-meals": {
    title: "African & Caribbean Ready Meals UK | Clip Services",
    description:
      "Ready meals, frozen and chilled foods from UK independents — order on Clip Services.",
    h1: "Ready meals & prepared foods",
    intro: `Find chilled, frozen and shelf-stable meals and snacks from independents who serve diaspora tastes. Order through Clip Services with secure card payment and WhatsApp updates from many sellers.`,
    keywords: ["ready", "meals", "frozen", "chilled"],
  },
  "snacks-sweets": {
    title: "African & Asian Snacks & Sweets Online UK | Clip Services",
    description:
      "Snacks, chin chin, sweets and treats from UK community stores — Clip Services marketplace.",
    h1: "Snacks & sweets from independents",
    intro: `Stock up on snacks, sweets and treats from African, Caribbean and Asian independents — plantain chips, chin chin, mithai and more. Browse stores on Clip Services and checkout securely.`,
    keywords: ["snacks", "sweets", "chin", "crisps", "biscuits"],
  },
};

/** Community / diaspora SEO pages: /community/[slug] */
export const COMMUNITY_SLUGS = [
  "african",
  "caribbean",
  "asian",
  "nigerian",
  "ghanaian",
  "jamaican",
  "south-asian",
  "halal",
];

export const COMMUNITY_COPY = {
  african: {
    title: "African Grocery Stores & Shops Online UK | Clip Services",
    description:
      "Shop African groceries, beauty and fashion from UK independent stores — order online with secure payments.",
    h1: "African stores & groceries online in the UK",
    intro: `From West African staples to East African spices, independent African grocers and traders across the UK list on Clip Services. Discover stores in Manchester, London, Birmingham and beyond — browse catalogues, read profiles, and pay securely with Stripe. Whether you need fufu flour, suya spice or beauty products, community retailers are one click away.`,
    keywords: ["african", "nigeria", "ghana", "kenya", "west africa", "jollof", "fufu"],
  },
  caribbean: {
    title: "Caribbean Food Shops & Stores Online UK | Clip Services",
    description:
      "Caribbean groceries, jerk, plantain and more from UK independents — shop online on Clip Services.",
    h1: "Caribbean food shops online UK",
    intro: `Jerk seasoning, plantain, ackee, rice and peas — Caribbean independents across the UK bring island flavours to your kitchen. Clip Services lists trusted shops and market traders so you can order online, pay by card, and collect or get delivery where offered.`,
    keywords: ["caribbean", "jamaican", "jerk", "plantain", "ackee", "rum"],
  },
  asian: {
    title: "Asian Grocery Stores Online UK | Clip Services",
    description:
      "South Asian groceries, spices, rice and more — independent UK stores on Clip Services.",
    h1: "Asian grocery stores online UK",
    intro: `Basmati, spices, lentils, sauces and speciality ingredients from South Asian-led independents. Clip Services helps you find grocers listing online with secure checkout — supporting local traders from Bradford to London.`,
    keywords: ["asian", "indian", "pakistani", "bangladeshi", "bengali", "bazaar"],
  },
  nigerian: {
    title: "Nigerian Food & Groceries Online UK | Clip Services",
    description:
      "Buy Nigerian food online — egusi, jollof ingredients, snacks from UK independents. Clip Services.",
    h1: "Nigerian food & groceries online UK",
    intro: `Palm oil, garri, pepper mix, chin chin and ingredients for jollof and egusi — Nigerian independents list on Clip Services across London, Manchester and other cities. Order from verified stores with Stripe and WhatsApp order updates.`,
    keywords: ["nigerian", "nigeria", "jollof", "egusi", "suya", "garri"],
  },
  ghanaian: {
    title: "Ghanaian Food & Groceries Online UK | Clip Services",
    description:
      "Shito, kenkey ingredients, Ghanaian snacks from UK stores — Clip Services marketplace.",
    h1: "Ghanaian groceries online UK",
    intro: `Find gari, shito, plantain and Ghanaian staples from community retailers. Clip Services connects you with independents who understand what you’re cooking — with secure online payment.`,
    keywords: ["ghanaian", "ghana", "shito", "kenkey", "banku"],
  },
  jamaican: {
    title: "Jamaican Food & Ingredients Online UK | Clip Services",
    description:
      "Jerk, escovitch fish ingredients, Jamaican snacks — UK independents on Clip Services.",
    h1: "Jamaican food online UK",
    intro: `Scotch bonnet, allspice, escovitch seasonings and Caribbean cupboard essentials from Jamaican-led independents. Browse Clip Services for stores near you and checkout securely.`,
    keywords: ["jamaican", "jamaica", "jerk", "escovitch"],
  },
  "south-asian": {
    title: "South Asian Groceries Online UK | Clip Services",
    description:
      "Spices, atta, lentils and South Asian ingredients from UK independents — Clip Services.",
    h1: "South Asian grocery shopping online UK",
    intro: `Independent grocers serving South Asian communities list rice, flour, spices, snacks and household lines. Clip Services offers one marketplace with Stripe checkout and clear store profiles.`,
    keywords: ["south asian", "indian", "pakistani", "punjabi", "gujarati"],
  },
  halal: {
    title: "Halal Groceries & Meat Online UK | Clip Services",
    description:
      "Halal products from African & Asian independent UK stores — order on Clip Services.",
    h1: "Halal groceries online UK",
    intro: `Community stores listing halal-suitable and certified products use Clip Services to reach customers online. Browse independents, compare what’s in stock, and pay securely — with collection or delivery where the seller offers it.`,
    keywords: ["halal", "islamic", "certified", "meat"],
  },
};

/** High-converting city + community landing pages: /stores/[combo-slug] */
export const COMBO_PAGES = [
  { slug: "nigerian-london", community: "nigerian", citySlug: "london" },
  { slug: "nigerian-manchester", community: "nigerian", citySlug: "manchester" },
  { slug: "jamaican-london", community: "jamaican", citySlug: "london" },
  { slug: "jamaican-birmingham", community: "jamaican", citySlug: "birmingham" },
  { slug: "halal-manchester", community: "halal", citySlug: "manchester" },
  { slug: "caribbean-birmingham", community: "caribbean", citySlug: "birmingham" },
  { slug: "asian-leeds", community: "asian", citySlug: "leeds" },
  { slug: "african-bristol", community: "african", citySlug: "bristol" },
];

export function getComboPage(slug) {
  const s = String(slug || "")
    .toLowerCase()
    .trim();
  return COMBO_PAGES.find((c) => c.slug === s) || null;
}

/** Programmatic SEO: /search/[slug] — preset query + filters */
export const SEARCH_LANDING_PAGES = [
  { slug: "plantain-manchester", q: "plantain", city: "Manchester", community: "" },
  { slug: "halal-meat-birmingham", q: "halal meat", city: "Birmingham", community: "" },
  { slug: "nigerian-food-london", q: "nigerian food", city: "London", community: "nigerian" },
  { slug: "caribbean-food-leeds", q: "caribbean food", city: "Leeds", community: "caribbean" },
  { slug: "african-hair-products-uk", q: "hair products", city: "", community: "african" },
  { slug: "fufu-flour-online-uk", q: "fufu flour", city: "", community: "" },
  { slug: "jerk-seasoning-uk", q: "jerk seasoning", city: "", community: "caribbean" },
  { slug: "asian-grocery-manchester", q: "asian grocery", city: "Manchester", community: "asian" },
];

export function getSearchLandingPage(slug) {
  const s = String(slug || "")
    .toLowerCase()
    .trim();
  return SEARCH_LANDING_PAGES.find((p) => p.slug === s) || null;
}

export function listingMatchesCity(listing, cityDisplay) {
  const blob = `${listing?.role || ""} ${listing?.bio || ""} ${(listing?.services || []).join(" ")}`.toLowerCase();
  return blob.includes(cityDisplay.toLowerCase());
}

export function listingMatchesCategory(listing, keywords) {
  const blob = `${listing?.role || ""} ${listing?.bio || ""} ${listing?.category || ""} ${(listing?.services || []).join(" ")}`.toLowerCase();
  return keywords.some((k) => blob.includes(k.toLowerCase()));
}

/** Match listing text to a community page (nigerian, caribbean, …). */
export function listingMatchesCommunity(listing, communityKey) {
  const copy = COMMUNITY_COPY[communityKey];
  if (!copy) return false;
  return listingMatchesCategory(listing, copy.keywords);
}

/** First matching community (ordered for H1 / SEO). */
export function inferPrimaryCommunity(listing) {
  const order = [
    "nigerian",
    "jamaican",
    "ghanaian",
    "caribbean",
    "african",
    "asian",
    "south-asian",
    "halal",
  ];
  for (const k of order) {
    if (listingMatchesCommunity(listing, k)) return k;
  }
  return null;
}

/** Cities near another (internal linking). */
export const CITY_NEARBY = {
  manchester: ["liverpool", "leeds", "birmingham"],
  london: ["birmingham", "leicester", "nottingham"],
  birmingham: ["leicester", "nottingham", "manchester"],
  leeds: ["manchester", "sheffield", "bradford"],
  leicester: ["birmingham", "nottingham", "london"],
  bradford: ["leeds", "manchester", "liverpool"],
  bristol: ["birmingham", "london", "nottingham"],
  liverpool: ["manchester", "leeds", "sheffield"],
  sheffield: ["leeds", "manchester", "nottingham"],
  nottingham: ["leicester", "birmingham", "sheffield"],
};
