'use server';

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createClient } from '@supabase/supabase-js';
import { translateWord } from './translate';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// A pool of basic words for kids to fallback on or mix in
const BASIC_POOL = [
  'cat', 'dog', 'apple', 'ball', 'red', 'blue', 'green', 'one', 'two', 'three', 
  'home', 'tree', 'sun', 'book', 'car', 'milk', 'water', 'fish', 'bird', 'pen',
  'box', 'star', 'cake', 'egg', 'hat', 'frog', 'jump', 'run', 'smile', 'love'
];

async function getDistractors(en: string) {
  try {
    // 1. Fetch related words (means-like and triggers)
    const [mlRes, trgRes] = await Promise.all([
      fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(en)}&max=30`),
      fetch(`https://api.datamuse.com/words?rel_trg=${encodeURIComponent(en)}&max=30`)
    ]);
    
    const mlData = await mlRes.json();
    const trgData = await trgRes.json();
    
    let candidates = [...mlData, ...trgData]
      .map((item: any) => item.word.toLowerCase())
      // Filter out duplicates, the word itself, multi-word phrases and very short/long strings
      .filter((word: string, index: number, self: string[]) => 
        self.indexOf(word) === index && 
        word !== en.toLowerCase() && 
        !word.includes(' ') && 
        !word.includes('-') &&
        word.length > 1 &&
        word.length < 12
      );

    // 2. Mix with BASIC_POOL to ensure we have enough simple words
    const randomBasics = BASIC_POOL
      .filter(w => w !== en.toLowerCase())
      .sort(() => 0.5 - Math.random())
      .slice(0, 10);
    
    candidates = [...new Set([...candidates, ...randomBasics])].slice(0, 25);

    // 3. Translate candidates
    // We limit parallel translations to avoid API rate limits
    const translatedDistractors = [];
    for (const word of candidates) {
      const cz = await translateWord(word);
      // Only keep if translation is different from English (avoids gibberish like 'iee' -> 'iee')
      if (cz && cz.toLowerCase() !== word.toLowerCase()) {
        translatedDistractors.push({ en: word, cz });
      }
      if (translatedDistractors.length >= 20) break;
    }

    return translatedDistractors;
  } catch (err) {
    console.error('Distractor generation error:', err);
    return BASIC_POOL.slice(0, 10).map(w => ({ en: w, cz: w })); // Minimal fallback
  }
}

export async function addVocabularyWord(en: string, cz: string) {
  if (!en || !cz) return { error: 'Chybí slovíčka' };
  if (!supabaseServiceKey) return { error: 'Chybí klíč SUPABASE_SERVICE_ROLE_KEY' };

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const enNormalized = en.trim().toLowerCase();

    const { data: existing } = await supabase
      .from('vocabulary')
      .select('id')
      .eq('en', enNormalized)
      .maybeSingle();

    if (existing) {
      return { error: `Slovíčko "${enNormalized}" už v databázi existuje!` };
    }

    const distractors = await getDistractors(enNormalized);

    const fileName = `${Date.now()}-${enNormalized.replace(/[^a-z0-9]/gi, '_')}.mp3`;
    const tts: any = new MsEdgeTTS();
    await tts.setMetadata("en-US-AvaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      const { audioStream } = tts.toStream(enNormalized);
      const chunks: Buffer[] = [];
      audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      audioStream.on("end", () => resolve(Buffer.concat(chunks)));
      audioStream.on("error", reject);
    });

    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, audioBuffer, { contentType: 'audio/mpeg' });

    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(fileName);

    const { data, error: dbError } = await supabase
      .from('vocabulary')
      .insert([{ 
        en: enNormalized, 
        cz: cz.trim().toLowerCase(), 
        audio_url: publicUrl,
        distractors: distractors,
        created_at: new Date().toISOString()
      }])
      .select();

    if (dbError) throw dbError;
    return { success: true, data };
  } catch (err: any) {
    console.error('Error in addVocabularyWord:', err);
    return { error: err.message || 'Nepodařilo se přidat slovíčko' };
  }
}
