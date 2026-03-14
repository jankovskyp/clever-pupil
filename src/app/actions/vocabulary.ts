'use server';

import { translateWord } from './translate';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Use service role for backend uploads

export async function addVocabularyWord(en: string, cz: string) {
  if (!en || !cz) return { error: 'Missing words' };

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const fileName = `${Date.now()}-${en.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;

    // 1. Generate Audio Buffer using Edge TTS
    const tts = new MsEdgeTTS();
    await tts.setMetadata("en-US-AvaMultilingualNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    // The library returns a promise that resolves when the stream is finished
    // We need to collect the chunks into a single buffer
    const audioData = await tts.push(en);
    
    // 2. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, audioData, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(fileName);

    // 4. Save to Database
    const { data, error: dbError } = await supabase
      .from('vocabulary')
      .insert([{ 
        en: en.toLowerCase(), 
        cz: cz.toLowerCase(), 
        audio_url: publicUrl,
        created_at: new Date().toISOString()
      }])
      .select();

    if (dbError) throw dbError;

    return { success: true, data };
  } catch (err: any) {
    console.error('Error in addVocabularyWord:', err);
    return { error: err.message || 'Failed to process word' };
  }
}
