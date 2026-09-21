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

module.exports = { fold };
