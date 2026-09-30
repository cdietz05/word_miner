// The grown-ups' check in front of the Parent Corner: a times-table
// question a parent answers in a second and a six-year-old almost certainly
// can't. It replaced a press-and-hold on the gear, which did nothing on a
// plain tap - so it looked broken - and which Safari on the iPad can cut
// short when it takes a held finger for the start of a text selection.

// Both numbers 3 to 9, so the answer is never a one-digit guess.
export function grownUpQuestion(random)
{
  const a = 3 + Math.floor(random() * 7);
  const b = 3 + Math.floor(random() * 7);
  return { text: `${a} × ${b}`, answer: a * b };
}
