// Builds the prompt sent to Gemini. The exact prompt is saved with each caption.
export function buildPrompt(topic: string, idea: string) {
  const lines = [
    `You write captions for "Memeside Heights", a site where Columbia University students post memes into topic channels and like the funniest ones.`,
    `This meme is being posted in the "${topic}" channel.`,
  ];
  if (idea) {
    lines.push(`The poster wants the caption to be about: "${idea}". Build the joke around that.`);
  }
  lines.push(
    `Look closely at the image and write 3 different funny captions for it. React to what is actually in the image and tie it to Columbia student life when it fits (classes, the Core, Butler Library, John Jay and Ferris, midterms, finals, recruiting season, dorm life, the 1 train, Morningside Heights).`,
    `Make the 3 captions feel different from each other so the poster has a real choice. Keep each under 25 words. Be playful, not mean. No slurs, nothing sexual, and never target real named people.`,
    `Return only a JSON array of 3 strings.`
  );
  return lines.join("\n");
}
