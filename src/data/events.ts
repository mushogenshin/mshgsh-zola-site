export interface TimelineEvent {
  year: string;
  title: string;
  color: string;
  side: "l" | "r";
  body: string;
}

export const EVENTS: TimelineEvent[] = [
  {
    year: "1999",
    title: "First words in Pascal",
    color: "#2f6df0",
    side: "r",
    body: "A rural, post-war mountain town in Vietnam. The first language I ever spoke to a machine.",
  },
  {
    year: "2005–08",
    title: "Architecture school, HCMC",
    color: "#e0531f",
    side: "l",
    body: "Gifted at drawing, I went looking for structure. Christopher Alexander over everything.",
  },
  {
    year: "2008",
    title: "Crossed to the US",
    color: "#8a8a8a",
    side: "r",
    body: "Studied abroad. Stayed. It would take fifteen years to reach a green card.",
  },
  {
    year: "2012",
    title: "Character animation",
    color: "#e0531f",
    side: "l",
    body: "AnimationMentor’s 18-month program. Learned to make weight and silhouette believable.",
  },
  {
    year: "2014",
    title: "Battle of Cascina",
    color: "#e0531f",
    side: "r",
    body: "19 figurative sculptures after Michelangelo. Too ambitious; abandoned. Now resuming.",
  },
  {
    year: "2016",
    title: "Busts of Great Thinkers",
    color: "#e0531f",
    side: "l",
    body: "Asimov, Feynman, Sagan, Tesla. Also set down too soon — and worth finishing.",
  },
  {
    year: "2018",
    title: "Python, and the turn toward code",
    color: "#2f6df0",
    side: "r",
    body: "Hired as an Anatomy Tech-Art Lead, I dove into pipeline. Vim, Docker, the whole toolbox.",
  },
  {
    year: "2020",
    title: "Rust",
    color: "#2f6df0",
    side: "l",
    body: "I’d kept two Scheme books since 2010 without grasping them. Systems thinking finally clicked.",
  },
  {
    year: "2023",
    title: "Rusty Hunter + green card",
    color: "#2f6df0",
    side: "r",
    body: "Rewrote a studio’s asset platform into Rust. And, at last, authorized to work anywhere in the US.",
  },
  {
    year: "2024",
    title: "Fossil Skater ships",
    color: "#4f9d69",
    side: "l",
    body: "Unreal Fellowship. Dinosaurs skate on car-shoes. Where the art and the code finally converge.",
  },
  {
    year: "2025",
    title: "Childlike Verse, in Bali",
    color: "#2f6df0",
    side: "r",
    body: "A talk on the Verse language from a non-programmer’s lens. The thread keeps going.",
  },
];
