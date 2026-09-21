// One way of writing a name down for matching, used wherever a crop or a place
// typed by a person has to be compared with one that was stored.
//
// Lower case, and every run of punctuation or spacing treated as a single
// space, so "Talong (Egg Plant)", "talong  egg plant" and "TALONG EGG PLANT"
// are all the same thing. Storing the folded form alongside the readable one
// means a lookup never has to guess.
const fold = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

// Words that look plural but are the singular thing, so stripping the "s"
// would change what they mean.
const NEVER_PLURAL = new Set(["kamatis", "sitaw", "gabi", "atis", "mais", "oats", "lettuce", "molasses"]);

// A rough singular of one word. It does not have to be right English - it only
// has to be the SAME answer for what someone types and for what is stored, so
// that "tomatoes" and "Tomato" meet in the middle. "asparagus" becoming
// "asparagu" is harmless for that reason, since the stored name folds to
// "asparagu" too.
function singular(word) {
  if (word.length < 4 || NEVER_PLURAL.has(word)) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`; // berries -> berry
  if (word.endsWith("oes")) return word.slice(0, -2); // tomatoes -> tomato
  if (/(ch|sh|ss|x|z)es$/.test(word)) return word.slice(0, -2); // squashes -> squash
  if (word.endsWith("ss")) return word; // grass stays grass
  if (word.endsWith("s")) return word.slice(0, -1); // bananas -> banana
  return word;
}

// The form a name is matched on: folded, then every word singularised. Applied
// to what is stored and to what is typed alike, so capitalisation and a
// trailing "s" stop mattering in either direction - "Green Beans" is found by
// "green bean", and "Tomato" by "tomatoes".
const matchKey = (value) => fold(value).split(" ").filter(Boolean).map(singular).join(" ");

module.exports = { fold, singular, matchKey };
