/** Static blog posts for /blog — Article schema in blog-html.js */
export const BLOG_POSTS = [
  {
    slug: "where-to-buy-nigerian-food-online-uk",
    title: "Where to Buy Nigerian Food Online in the UK",
    metaDescription:
      "Find Nigerian groceries online: jollof ingredients, palm oil, snacks and spices from UK independents on Clip Services — secure checkout & local stores.",
    datePublished: "2026-04-01",
    author: "Clip Services",
    sections: [
      {
        h2: "Why shop Nigerian groceries online?",
        html: `<p>From London to Manchester, Nigerian communities across the UK rely on independent grocers for garri, egusi, pepper mixes, chin chin and ingredients for jollof and soups. Shopping online saves time and helps you discover stores beyond your immediate high street — especially if you’ve moved city or want to compare what’s in stock before you travel.</p>`,
      },
      {
        h2: "What you can typically find",
        html: `<p>Many independents list rice, beans, dried fish, palm oil, spices, snacks, drinks and frozen lines. Hair and beauty products often sit alongside groceries. On <a href="/stores">Clip Services</a>, each store has its own page: browse their line, add to basket where enabled, and pay securely with Stripe.</p>`,
      },
      {
        h2: "Tips for first-time orders",
        html: `<p>Check whether the store offers <strong>collection</strong> or <strong>delivery</strong> in your area. Read the store bio for opening hours and WhatsApp contact — many sellers confirm substitutions on WhatsApp. Start with a smaller basket to build trust, then scale up for monthly shops.</p>`,
      },
      {
        h2: "Explore communities & cities",
        html: `<p>Browse <a href="/community/nigerian">Nigerian stores UK-wide</a>, or jump to <a href="/cities/london">London</a> and <a href="/cities/manchester">Manchester</a> city pages. For spices and staples, see <a href="/categories/spices-ingredients">spices & ingredients</a> and <a href="/categories/rice-grains-flour">rice & grains</a>.</p>`,
      },
    ],
  },
  {
    slug: "best-african-grocery-stores-manchester",
    title: "Best African Grocery Stores in Manchester — How to Choose",
    metaDescription:
      "Discover African grocery shopping in Greater Manchester: Longsight, Rusholme, Cheetham Hill and online via Clip Services independents.",
    datePublished: "2026-04-02",
    author: "Clip Services",
    sections: [
      {
        h2: "Manchester’s African retail scene",
        html: `<p>Greater Manchester has long supported West and East African independents — from busy high streets to market traders. Whether you need fufu flour, suya spice or beauty lines, local stores often stock what supermarket chains don’t.</p>`,
      },
      {
        h2: "Shopping online vs in person",
        html: `<p>Visiting in person lets you browse fresh produce; ordering online through <a href="/cities/manchester">Clip Services Manchester</a> helps when you’re short on time or want to reserve stock. Our <a href="/stores">store directory</a> links to independents who publish catalogues and take card payments.</p>`,
      },
      {
        h2: "Support independents",
        html: `<p>Every order through community stores keeps spend in local businesses. Combine trips with <a href="/categories/fresh-produce">fresh produce</a> and <a href="/categories/meat-and-fish">meat & fish</a> categories to plan a full shop.</p>`,
      },
    ],
  },
  {
    slug: "top-caribbean-ingredients-cooking-home",
    title: "Top Caribbean Ingredients for Cooking at Home",
    metaDescription:
      "Plantain, ackee, jerk seasoning, rice and peas essentials — buy from UK Caribbean independents on Clip Services.",
    datePublished: "2026-04-03",
    author: "Clip Services",
    sections: [
      {
        h2: "Cupboard staples",
        html: `<p>Allspice, thyme, scotch bonnet, coconut milk and rice anchor many Caribbean dishes. Independent grocers stock brands and bulk lines suited to home cooking — often alongside drinks and snacks you won’t find in generic supermarkets.</p>`,
      },
      {
        h2: "Fresh produce & protein",
        html: `<p>Plantain, yam and green banana appear on many shopping lists; some stores list goat, fish and poultry subject to availability. Use <a href="/community/caribbean">Caribbean stores on Clip Services</a> and filter by <a href="/categories/fresh-produce">fresh produce</a>.</p>`,
      },
      {
        h2: "Ready when you are",
        html: `<p>Pair ingredients with <a href="/categories/ready-meals">ready meals</a> for busy weeks, and explore <a href="/categories/drinks-beverages">drinks</a> for mixers and malt favourites.</p>`,
      },
    ],
  },
  {
    slug: "halal-meat-online-birmingham",
    title: "Where to Find Halal Meat & Groceries Online in Birmingham",
    metaDescription:
      "Halal groceries and meat from Birmingham independents — order online with Clip Services, Stripe checkout, collection & delivery where offered.",
    datePublished: "2026-04-04",
    author: "Clip Services",
    sections: [
      {
        h2: "Community-led retail",
        html: `<p>Birmingham’s Asian and African communities support a wide halal retail scene — from Sparkbrook to suburban high streets. Independents often combine groceries, butcher counters and household lines under one roof.</p>`,
      },
      {
        h2: "Ordering online",
        html: `<p>Clip Services lists stores with clear profiles and secure payment. Visit our <a href="/cities/birmingham">Birmingham city page</a> and <a href="/categories/halal-products">halal products</a> category to shortlist sellers, then open each store to see what they list today.</p>`,
      },
      {
        h2: "Beyond meat",
        html: `<p>Halal-labelled snacks, spices and household items matter too. Browse <a href="/community/halal">halal-focused discovery</a> alongside <a href="/stores">all UK stores</a>.</p>`,
      },
    ],
  },
  {
    slug: "asian-grocery-shopping-online-uk-guide",
    title: "Asian Grocery Shopping Online UK — A Practical Guide",
    metaDescription:
      "Rice, spices, lentils, sauces: how to shop South Asian groceries online from UK independents using Clip Services.",
    datePublished: "2026-04-05",
    author: "Clip Services",
    sections: [
      {
        h2: "Why independents matter",
        html: `<p>South Asian grocers often carry regional brands, bulk bags and speciality items that mainstream supermarkets only stock seasonally. Shopping with independents supports families who’ve served communities for decades.</p>`,
      },
      {
        h2: "Build a smarter basket",
        html: `<p>Start with <a href="/categories/rice-grains-flour">rice, grains & flour</a>, add <a href="/categories/spices-ingredients">spices</a>, then fill snacks from <a href="/categories/snacks-sweets">snacks & sweets</a>. Many Clip Services sellers list drinks and frozen lines — check each store page.</p>`,
      },
      {
        h2: "Nationwide discovery",
        html: `<p>Use <a href="/community/south-asian">South Asian stores</a> and city hubs like <a href="/cities/london">London</a> or <a href="/cities/leicester">Leicester</a> to find sellers that deliver or offer collection on your route.</p>`,
      },
    ],
  },
];

export function getPostBySlug(slug) {
  const s = String(slug || "").toLowerCase().trim();
  return BLOG_POSTS.find((p) => p.slug === s) || null;
}
