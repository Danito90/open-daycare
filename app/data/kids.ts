export type ParentLink = {
  name: string;
  relationship: string;
  status: "active" | "pending";
  initial: string;
  avatarBackground: string;
};

export type Kid = {
  id: string;
  name: string;
  initial: string;
  age: number;
  avatarBackground: string;
  avatarColor: string;
  room: "Soles";
  allergyLabel?: string;
  birthDate: string;
  enrollmentDate: string;
  allergiesAndNotes: string;
  parents: ParentLink[];
};

export const kids: Kid[] = [
  {
    id: "mateo-fernandez",
    name: "Mateo Fernández",
    initial: "M",
    age: 3,
    avatarBackground: "#A9D9E8",
    avatarColor: "#1F7A93",
    room: "Soles",
    allergyLabel: "MANÍ",
    birthDate: "12 mar 2022",
    enrollmentDate: "feb 2025",
    allergiesAndNotes: "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.",
    parents: [
      { name: "Lucía Fernández", relationship: "Mamá", status: "active", initial: "L", avatarBackground: "#C9B6E8" },
      { name: "Diego Fernández", relationship: "Papá", status: "pending", initial: "D", avatarBackground: "#A9C7E8" },
    ],
  },
  {
    id: "sofia-mendez",
    name: "Sofía Méndez",
    initial: "S",
    age: 2,
    avatarBackground: "#F4B8CC",
    avatarColor: "#C44A7A",
    room: "Soles",
    birthDate: "18 ago 2023",
    enrollmentDate: "mar 2025",
    allergiesAndNotes: "Sin alergias registradas. Le gusta participar en actividades de música.",
    parents: [{ name: "Mariana Méndez", relationship: "Mamá", status: "active", initial: "M", avatarBackground: "#F4B8CC" }],
  },
  {
    id: "benjamin-ruiz",
    name: "Benjamín Ruiz",
    initial: "B",
    age: 3,
    avatarBackground: "#B9DEC4",
    avatarColor: "#3E8B62",
    room: "Soles",
    birthDate: "4 jun 2022",
    enrollmentDate: "feb 2025",
    allergiesAndNotes: "Sin alergias registradas. Usa lentes para actividades de lectura.",
    parents: [
      { name: "Pablo Ruiz", relationship: "Papá", status: "active", initial: "P", avatarBackground: "#B9DEC4" },
      { name: "Ana Ruiz", relationship: "Mamá", status: "active", initial: "A", avatarBackground: "#F4DC8E" },
    ],
  },
  {
    id: "valentina-soto",
    name: "Valentina Soto",
    initial: "V",
    age: 2,
    avatarBackground: "#F4DC8E",
    avatarColor: "#9A7B1E",
    room: "Soles",
    allergyLabel: "VINCULAR",
    birthDate: "27 sep 2023",
    enrollmentDate: "abr 2025",
    allergiesAndNotes: "Sin alergias registradas. Aún no tiene padres vinculados en la sala.",
    parents: [],
  },
  {
    id: "tomas-diaz",
    name: "Tomás Díaz",
    initial: "T",
    age: 3,
    avatarBackground: "#C9B6E8",
    avatarColor: "#7B5FC0",
    room: "Soles",
    allergyLabel: "LACTOSA",
    birthDate: "9 abr 2022",
    enrollmentDate: "feb 2025",
    allergiesAndNotes: "Intolerancia a la lactosa. Ofrecer alternativas sin lácteos durante la merienda.",
    parents: [{ name: "Carla Díaz", relationship: "Mamá", status: "active", initial: "C", avatarBackground: "#C9B6E8" }],
  },
  {
    id: "emma-castro",
    name: "Emma Castro",
    initial: "E",
    age: 2,
    avatarBackground: "#F4B8CC",
    avatarColor: "#C44A7A",
    room: "Soles",
    birthDate: "15 jul 2023",
    enrollmentDate: "mar 2025",
    allergiesAndNotes: "Sin alergias registradas. Lleva objeto de apego en la mochila.",
    parents: [{ name: "Sofía Castro", relationship: "Mamá", status: "active", initial: "S", avatarBackground: "#F4B8CC" }],
  },
  {
    id: "lucas-romero",
    name: "Lucas Romero",
    initial: "L",
    age: 3,
    avatarBackground: "#A9D9E8",
    avatarColor: "#1F7A93",
    room: "Soles",
    birthDate: "22 may 2022",
    enrollmentDate: "feb 2025",
    allergiesAndNotes: "Sin alergias registradas. Necesita unos minutos de adaptación al llegar.",
    parents: [{ name: "Martín Romero", relationship: "Papá", status: "active", initial: "M", avatarBackground: "#A9D9E8" }],
  },
  {
    id: "olivia-vega",
    name: "Olivia Vega",
    initial: "O",
    age: 2,
    avatarBackground: "#B9DEC4",
    avatarColor: "#3E8B62",
    room: "Soles",
    birthDate: "3 oct 2023",
    enrollmentDate: "abr 2025",
    allergiesAndNotes: "Sin alergias registradas. Disfruta especialmente de los cuentos ilustrados.",
    parents: [{ name: "Elena Vega", relationship: "Mamá", status: "active", initial: "E", avatarBackground: "#B9DEC4" }],
  },
];

export function getKid(id: string) {
  return kids.find((kid) => kid.id === id);
}
