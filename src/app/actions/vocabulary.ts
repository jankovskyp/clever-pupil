'use server';

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Logic to generate similar-looking/sounding words
function generateVisualDistractors(word: string): string[] {
  const variations = new Set<string>();
  const letters = word.split('');

  // 1. Swap adjacent letters
  for (let i = 0; i < letters.length - 1; i++) {
    const swap = [...letters];
    [swap[i], swap[i+1]] = [swap[i+1], swap[i]];
    variations.add(swap.join(''));
  }

  // 2. Remove one letter
  if (letters.length > 3) {
    for (let i = 0; i < letters.length; i++) {
      const removed = [...letters];
      removed.splice(i, 1);
      variations.add(removed.join(''));
    }
  }

  // 3. Repeat one letter
  for (let i = 0; i < letters.length; i++) {
    const repeated = [...letters];
    repeated.splice(i, 0, letters[i]);
    variations.add(repeated.join(''));
  }

  return Array.from(variations)
    .filter(v => v !== word && v.length > 1)
    .sort(() => 0.5 - Math.random())
    .slice(0, 15);
}

async function getEnhancedDistractors(en: string) {
  const enLower = en.toLowerCase();
  
  // Try to get real similar words from Datamuse (sounds like)
  let soundsLike: string[] = [];
  try {
    const res = await fetch(`https://api.datamuse.com/words?sl=${encodeURIComponent(enLower)}&max=10`);
    const data = await res.json();
    soundsLike = data.map((item: any) => item.word.toLowerCase());
  } catch (e) {}

  // Mix real words with generated variations
  const visual = [...new Set([...soundsLike, ...generateVisualDistractors(enLower)])]
    .filter((w: string) => w !== enLower && !w.includes(' ') && w.length > 1)
    .slice(0, 20);

  return visual;
}

export async function addVocabularyWord(en: string) {
  if (!en) return { error: 'Chybí slovíčko' };
  if (!supabaseServiceKey) return { error: 'Chybí klíč SUPABASE_SERVICE_ROLE_KEY' };

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const enNormalized = en.trim().toLowerCase();

    const { data: existing } = await supabase
      .from('vocabulary')
      .select('id')
      .eq('en', enNormalized)
      .maybeSingle();

    if (existing) return { error: `Slovíčko "${enNormalized}" už existuje!` };

    const distractors = await getEnhancedDistractors(enNormalized);
    const audioUrl = await generateAndUploadAudio(enNormalized, supabase);

    const { data, error: dbError } = await supabase
      .from('vocabulary')
      .insert([{ 
        en: enNormalized, 
        audio_url: audioUrl,
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

async function generateAndUploadAudio(en: string, supabase: any) {
  const fileName = `${Date.now()}-${en.replace(/[^a-z0-9]/gi, '_')}.mp3`;
  const tts: any = new MsEdgeTTS();
  await tts.setMetadata("en-US-AvaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  
  const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
    const { audioStream } = tts.toStream(en);
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
  return publicUrl;
}

export async function adminRegenerateAll() {
  if (!supabaseServiceKey) return { error: 'Unauthorized' };
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: words, error: fetchError } = await supabase.from('vocabulary').select('*');
    if (fetchError) throw fetchError;

    let updatedCount = 0;
    for (const word of (words || [])) {
      const distractors = await getEnhancedDistractors(word.en);
      const audioUrl = word.audio_url || await generateAndUploadAudio(word.en, supabase);

      await supabase.from('vocabulary').update({
        distractors,
        audio_url: audioUrl
      }).eq('id', word.id);
      updatedCount++;
    }

    return { success: true, count: updatedCount };
  } catch (err: any) {
    console.error('Admin regenerate error:', err);
    return { error: err.message };
  }
}
