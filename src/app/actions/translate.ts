'use server';

export async function translateWord(text: string): Promise<string> {
  if (!text) return '';
  
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|cs`);
    const data = await res.json();
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText.toLowerCase();
    }
    return '';
  } catch (err) {
    console.error('Translation error:', err);
    return '';
  }
}
