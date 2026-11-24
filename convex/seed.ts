import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { emptyBeanAggregates } from "./lib/userBeanState";
import { slugify } from "./lib/validate";

/**
 * Sample catalog so a fresh deployment isn't empty.
 * Run once with: bunx convex run seed:catalog
 */
const ROASTERS = [
  { name: "Tidewater Roasting Co.", location: "Portland, OR" },
  { name: "Ember & Ash", location: "Melbourne" },
  { name: "Kopi Pagi", location: "Bandung" },
  { name: "Nordlys Kaffe", location: "Oslo" },
  { name: "Pequeño Lote", location: "Medellín" },
] as const;

type SeedBean = {
  roaster: (typeof ROASTERS)[number]["name"];
  name: string;
  origin: string;
  region?: string;
  producer?: string;
  varieties: string[];
  process: string;
  roastLevel: string;
  altitudeMin?: number;
  altitudeMax?: number;
  roasterNotes: string[];
  description?: string;
};

const BEANS: SeedBean[] = [
  {
    roaster: "Tidewater Roasting Co.",
    name: "Guji Hambela",
    origin: "Ethiopia",
    region: "Guji",
    producer: "Hambela Washing Station",
    varieties: ["Heirloom"],
    process: "Natural",
    roastLevel: "Light",
    altitudeMin: 1900,
    altitudeMax: 2200,
    roasterNotes: ["Blueberry", "Jasmine", "Milk chocolate"],
    description: "A jammy, floral natural that tastes like blueberry pie in a cup.",
  },
  {
    roaster: "Tidewater Roasting Co.",
    name: "House Espresso",
    origin: "Blend",
    varieties: ["Bourbon", "Catuai"],
    process: "Washed",
    roastLevel: "Medium",
    roasterNotes: ["Caramel", "Hazelnut", "Cocoa"],
    description: "Brazil and Colombia, built for milk drinks.",
  },
  {
    roaster: "Ember & Ash",
    name: "Kiambu AA",
    origin: "Kenya",
    region: "Kiambu",
    producer: "Gachatha Cooperative",
    varieties: ["SL28", "SL34"],
    process: "Washed",
    roastLevel: "Light",
    altitudeMin: 1700,
    altitudeMax: 1900,
    roasterNotes: ["Blackcurrant", "Grapefruit", "Brown sugar"],
  },
  {
    roaster: "Ember & Ash",
    name: "Finca El Injerto",
    origin: "Guatemala",
    region: "Huehuetenango",
    varieties: ["Bourbon"],
    process: "Washed",
    roastLevel: "Medium-light",
    altitudeMin: 1500,
    altitudeMax: 1800,
    roasterNotes: ["Red apple", "Caramel", "Milk chocolate"],
  },
  {
    roaster: "Kopi Pagi",
    name: "Gayo Wine Process",
    origin: "Indonesia",
    region: "Aceh",
    producer: "Gayo smallholders",
    varieties: ["Ateng", "Tim Tim"],
    process: "Anaerobic",
    roastLevel: "Medium-light",
    altitudeMin: 1400,
    altitudeMax: 1600,
    roasterNotes: ["Wine", "Cherry", "Dark chocolate"],
    description: "Long anaerobic fermentation gives this Sumatran a boozy, fruity edge.",
  },
  {
    roaster: "Kopi Pagi",
    name: "Toraja Sapan",
    origin: "Indonesia",
    region: "Sulawesi",
    varieties: ["S795", "Typica"],
    process: "Wet-hulled",
    roastLevel: "Medium-dark",
    altitudeMin: 1500,
    altitudeMax: 1900,
    roasterNotes: ["Earthy", "Cedar", "Brown sugar"],
  },
  {
    roaster: "Kopi Pagi",
    name: "Kintamani Honey",
    origin: "Indonesia",
    region: "Bali",
    varieties: ["Kartika", "S795"],
    process: "Honey",
    roastLevel: "Medium",
    roasterNotes: ["Orange", "Honey", "Clove"],
  },
  {
    roaster: "Nordlys Kaffe",
    name: "Gesha Village Lot 74",
    origin: "Ethiopia",
    region: "Bench Maji",
    producer: "Gesha Village Estate",
    varieties: ["Gesha"],
    process: "Washed",
    roastLevel: "Light",
    altitudeMin: 1900,
    altitudeMax: 2100,
    roasterNotes: ["Jasmine", "Bergamot", "Peach"],
  },
  {
    roaster: "Nordlys Kaffe",
    name: "Huila Decaf",
    origin: "Colombia",
    region: "Huila",
    varieties: ["Caturra", "Castillo"],
    process: "Washed",
    roastLevel: "Medium",
    roasterNotes: ["Maple", "Red apple", "Almond"],
    description: "Sugarcane-decaffeinated, so it keeps its sweetness.",
  },
  {
    roaster: "Pequeño Lote",
    name: "Finca La Esperanza Pink Bourbon",
    origin: "Colombia",
    region: "Huila",
    producer: "Rodrigo Sánchez",
    varieties: ["Pink Bourbon"],
    process: "Washed",
    roastLevel: "Light",
    altitudeMin: 1750,
    altitudeMax: 1850,
    roasterNotes: ["Strawberry", "Lemon", "Honey"],
  },
  {
    roaster: "Pequeño Lote",
    name: "Cerrado Mineiro",
    origin: "Brazil",
    region: "Minas Gerais",
    varieties: ["Yellow Catuai"],
    process: "Natural",
    roastLevel: "Medium-dark",
    altitudeMin: 1000,
    altitudeMax: 1200,
    roasterNotes: ["Hazelnut", "Dark chocolate", "Tobacco"],
  },
  {
    roaster: "Pequeño Lote",
    name: "Santa Teresa Carbonic",
    origin: "Panama",
    region: "Boquete",
    varieties: ["Catuai"],
    process: "Carbonic maceration",
    roastLevel: "Light",
    roasterNotes: ["Passion fruit", "Pineapple", "Cinnamon"],
  },
];

export const catalog = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    if ((await ctx.db.query("beans").first()) !== null) {
      return "Catalog already has beans; nothing to do.";
    }
    const roasterIds = new Map<string, { id: Id<"roasters">; count: number }>();
    for (const r of ROASTERS) {
      const id = await ctx.db.insert("roasters", {
        name: r.name,
        slug: slugify(r.name),
        location: r.location,
        beanCount: 0,
      });
      roasterIds.set(r.name, { id, count: 0 });
    }
    for (const { roaster, ...b } of BEANS) {
      const entry = roasterIds.get(roaster)!;
      await ctx.db.insert("beans", {
        ...b,
        roasterId: entry.id,
        roasterName: roaster,
        searchText: [b.name, roaster, b.origin, b.region, b.producer, b.process, ...b.varieties]
          .filter(Boolean)
          .join(" "),
        ...emptyBeanAggregates(),
      });
      entry.count += 1;
    }
    for (const { id, count } of roasterIds.values()) {
      await ctx.db.patch("roasters", id, { beanCount: count });
    }
    return `Added ${ROASTERS.length} roasters and ${BEANS.length} beans.`;
  },
});
