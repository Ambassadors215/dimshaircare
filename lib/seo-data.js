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
    title: "African, Caribbean & Asian Stores in Manchester | Clip Services",
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

/** Category landing slugs → SEO + filter keywords (for listing text match). */
export const CATEGORY_SLUGS = [
  "fresh-produce",
  "halal",
  "hair-beauty",
  "fashion-fabric",
  "spices-staples",
  "ready-meals",
  "drinks",
];

export const CATEGORY_COPY = {
  "fresh-produce": {
    title: "Buy African & Caribbean Fresh Produce Online UK | Clip Services",
    description:
      "Order fresh African and Caribbean fruit, vegetables and produce from UK independents. Secure payments — Clip Services marketplace.",
    h1: "Fresh African & Caribbean produce online",
    intro: `Find plantain, yams, okra, scotch bonnet, callaloo and more from independent sellers who understand what you’re cooking. Clip Services connects you with stores across the UK — pay securely by card and choose collection or delivery where offered.`,
    keywords: ["produce", "fresh", "vegetables", "fruit", "plantain", "yam", "greens"],
  },
  halal: {
    title: "Halal Products Online UK — African & Asian Stores | Clip Services",
    description:
      "Halal groceries, meat and household products from trusted African and Asian independent stores. Shop online on Clip Services UK.",
    h1: "Halal groceries & products — UK independents",
    intro: `Shop halal-certified and halal-suitable lines from community stores you can trust. From spices and snacks to meat where sellers offer it — all through independent African and Asian retailers on Clip Services with clear checkout.`,
    keywords: ["halal", "meat", "groceries", "islamic", "certified"],
  },
  "hair-beauty": {
    title: "African & Caribbean Hair & Beauty Products UK | Clip Services",
    description:
      "Hair care, braids supplies, beauty and cosmetics from UK independents. Shop Clip Services.",
    h1: "Hair & beauty from community stores",
    intro: `Support independent sellers stocking the brands and products your hair and skin need. Browse listings and order online where stores offer retail delivery or pickup.`,
    keywords: ["hair", "beauty", "cosmetics", "braids", "extensions"],
  },
  "fashion-fabric": {
    title: "African & Asian Fashion & Fabric Online UK | Clip Services",
    description:
      "Fashion, fabrics and cultural clothing from independent UK stores on Clip Services.",
    h1: "Fashion & fabric",
    intro: `Discover independents selling fabrics, ready-to-wear and accessories rooted in African, Caribbean and Asian communities.`,
    keywords: ["fashion", "fabric", "ankara", "clothing"],
  },
  "spices-staples": {
    title: "African & Asian Spices & Staples Online UK | Clip Services",
    description:
      "Spices, rice, flour, oils and pantry staples from UK independent grocers — Clip Services.",
    h1: "Spices & pantry staples",
    intro: `Stock your kitchen with staples and spices from community grocers listing on Clip Services.`,
    keywords: ["spices", "rice", "flour", "oil", "staples", "grocery"],
  },
  "ready-meals": {
    title: "African & Caribbean Ready Meals & Snacks UK | Clip Services",
    description:
      "Ready meals, snacks and treats from independent UK stores — order on Clip Services.",
    h1: "Ready meals & snacks",
    intro: `Find chilled, frozen and shelf-stable meals and snacks from independents who serve diaspora tastes.`,
    keywords: ["ready", "meals", "snacks", "frozen"],
  },
  drinks: {
    title: "African & Caribbean Drinks & Beverages UK | Clip Services",
    description:
      "Juices, soft drinks, malt and speciality beverages from UK independents on Clip Services.",
    h1: "Drinks & beverages",
    intro: `Shop drinks and mixers from community stores — one marketplace, secure checkout.`,
    keywords: ["drinks", "juice", "beverages", "malt"],
  },
};

export function listingMatchesCity(listing, cityDisplay) {
  const blob = `${listing?.role || ""} ${listing?.bio || ""} ${(listing?.services || []).join(" ")}`.toLowerCase();
  return blob.includes(cityDisplay.toLowerCase());
}

export function listingMatchesCategory(listing, keywords) {
  const blob = `${listing?.role || ""} ${listing?.bio || ""} ${listing?.category || ""} ${(listing?.services || []).join(" ")}`.toLowerCase();
  return keywords.some((k) => blob.includes(k.toLowerCase()));
}
