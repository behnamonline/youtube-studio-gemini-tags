// توکن جمنای خود را اینجا بگذارید
const GEMINI_API_KEY = "YOUR-GEMINI-API-TOKEN";

// توکن جمنای خود را اینجا بگذارید
// تابع اصلاح‌شده برای استخراج دقیق تگ‌های موجود
function getExistingTags() {
  const existingTags = [];
  const chipElements = document.querySelectorAll('ytcp-chip #chip-text');
  
  chipElements.forEach(el => {
    const text = el.innerText ? el.innerText.trim() : '';
    if (text) existingTags.push(text);
  });
  
  return existingTags;
}

// تابع درخواست به جمنای برای تولید تگ‌ها
async function fetchTagsFromGemini(titleText, existingTags) {
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

  const existingTagsContext = existingTags.length > 0 
    ? `Existing user-added tags: ${existingTags.join(', ')}.` 
    : 'No existing tags added yet.';

  const prompt = `You are a YouTube SEO expert.
Video Title: "${titleText}"
${existingTagsContext}

Task: Generate exactly 10 highly relevant YouTube tags based on the title and any existing tags provided.
Requirements:
1. Include common technical terms, related tool/service names, protocols, and technical slang/keywords associated with the topic (e.g., if topic is Telegram Bot, include technical terms like botfather, webhook, api, nodejs, python, etc. if relevant).
2. DO NOT repeat any of the existing user-added tags.
3. Return ONLY the 10 tags as a single comma-separated list.
4. DO NOT include spaces around commas, quotes, markdown, numbering, bullet points, or any extra text.

Example format: tag1,tag2,tag3,tag4`;

  const response = await fetch(geminiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  
  return rawText.trim().replace(/[\r\n]+/g, '');
}

// تابع شبیه‌سازی وارد کردن یک تگ و زدن کلید Enter
function addSingleTag(tagInput, tagText) {
  tagInput.value = tagText;
  tagInput.dispatchEvent(new Event('input', { bubbles: true }));
  tagInput.dispatchEvent(new Event('change', { bubbles: true }));

  tagInput.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter',
    keyCode: 13,
    code: 'Enter',
    which: 13,
    bubbles: true
  }));
}

// تابع اصلی افزودن دکمه به صفحه
function injectTransferButton() {
  const tagInput = document.querySelector('input#text-input');

  if (tagInput && !document.getElementById('btn-copy-title-to-tag')) {
    const btn = document.createElement('button');
    btn.id = 'btn-copy-title-to-tag';
    btn.type = 'button';
    btn.innerText = '✨ تولید و ثبت تگ با AI';

    btn.style.marginLeft = '8px';
    btn.style.padding = '6px 12px';
    btn.style.backgroundColor = '#065fd4';
    btn.style.color = '#ffffff';
    btn.style.border = 'none';
    btn.style.borderRadius = '18px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '12px';
    btn.style.fontWeight = '500';

    btn.addEventListener('click', async () => {
      const titleBox = document.querySelector('ytcp-social-suggestion-input#input #textbox');

      if (!titleBox) {
        alert('فیلد عنوان پیدا نشد!');
        return;
      }

      const titleText = titleBox.innerText.trim();

      if (!titleText) {
        alert('متن عنوان خالی است!');
        return;
      }

      // دریافت تگ‌های موجود با سلکتور اصلاح‌شده
      const existingTags = getExistingTags();

      const originalBtnText = btn.innerText;
      btn.innerText = '⏳ در حال تحلیل و دریافت تگ‌ها...';
      btn.disabled = true;

      try {
        const tagsString = await fetchTagsFromGemini(titleText, existingTags);

        if (!tagsString) {
          alert('تگ معتبری از جمنای دریافت نشد!');
          return;
        }

        const tagsList = tagsString.split(/[,،]/).map(t => t.trim()).filter(Boolean);

        for (const tag of tagsList) {
          addSingleTag(tagInput, tag);
          await new Promise(resolve => setTimeout(resolve, 150));
        }

      } catch (error) {
        console.error('خطا در ارتباط با Gemini:', error);
        alert('خطایی در ارتباط با API جمنای رخ داد.');
      } finally {
        btn.innerText = originalBtnText;
        btn.disabled = false;
      }
    });

    tagInput.parentNode.insertBefore(btn, tagInput.nextSibling);
  }
}

const observer = new MutationObserver(() => {
  injectTransferButton();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

injectTransferButton();
