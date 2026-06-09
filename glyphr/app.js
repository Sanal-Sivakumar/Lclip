// Glyphr Application Logic

// 1. Static Databases
const EMOJI_DB = {
    smileys: [
        { char: "😊", name: "smiling face with smiling eyes", tags: "happy smile face joy" },
        { char: "😂", name: "face with tears of joy", tags: "happy laugh lol tears" },
        { char: "🤣", name: "rolling on the floor laughing", tags: "laugh rofl lol face" },
        { char: "🥰", name: "smiling face with hearts", tags: "love crush heart happy" },
        { char: "😍", name: "smiling face with heart-eyes", tags: "love heart eye happy" },
        { char: "😘", name: "face blowing a kiss", tags: "kiss love heart" },
        { char: "🤡", name: "clown face", tags: "clown joke silly" },
        { char: "😎", name: "smiling face with sunglasses", tags: "cool sunglasses chill" },
        { char: "🤔", name: "thinking face", tags: "think query mind guess" },
        { char: "😴", name: "sleeping face", tags: "sleep tired zzz" },
        { char: "😭", name: "loudly crying face", tags: "cry sad sob tears" },
        { char: "😡", name: "pouting face", tags: "angry mad furious" },
        { char: "😱", name: "face screaming in fear", tags: "fear scream shock" },
        { char: "🥳", name: "partying face", tags: "party celebrate hat balloon" },
        { char: "🥺", name: "pleading face", tags: "please beg puppy eyes" },
        { char: "👍", name: "thumbs up", tags: "good yes okay perfect like" },
        { char: "👋", name: "waving hand", tags: "hello goodbye wave hi" },
        { char: "🔥", name: "fire", tags: "hot burn flame lit cool" }
    ],
    animals: [
        { char: "🐱", name: "cat face", tags: "cat kitten animal pet meow" },
        { char: "🐶", name: "dog face", tags: "dog puppy animal pet bark" },
        { char: "🐻", name: "bear face", tags: "bear animal forest cub" },
        { char: "🦊", name: "fox face", tags: "fox animal clever forest" },
        { char: "🦁", name: "lion face", tags: "lion king animal wild roar" },
        { char: "🐮", name: "cow face", tags: "cow farm animal milk moo" },
        { char: "🐷", name: "pig face", tags: "pig farm animal oink" },
        { char: "🐸", name: "frog face", tags: "frog animal water green ribbit" },
        { char: "🐵", name: "monkey face", tags: "monkey tree animal chimp" },
        { char: "🦄", name: "unicorn face", tags: "unicorn magic horse fantasy" },
        { char: "🐝", name: "honeybee", tags: "bee honey insect sting fly" },
        { char: "🦋", name: "butterfly", tags: "butterfly insect wings beauty" }
    ],
    food: [
        { char: "🍎", name: "red apple", tags: "apple fruit red healthy" },
        { char: "🍌", name: "banana", tags: "banana fruit yellow sweet" },
        { char: "🍉", name: "watermelon", tags: "watermelon fruit summer water" },
        { char: "🍓", name: "strawberry", tags: "strawberry berry fruit red sweet" },
        { char: "🍕", name: "pizza", tags: "pizza cheese slice junk food fast" },
        { char: "🍔", name: "hamburger", tags: "burger beef fast food cheese" },
        { char: "🍟", name: "french fries", tags: "fries potato fast food salt" },
        { char: "🍣", name: "sushi", tags: "sushi fish japan rice roll" },
        { char: "🍦", name: "soft ice cream", tags: "ice cream cone sweet summer cold" },
        { char: "🍩", name: "donut", tags: "donut sweet dessert glaze ring" },
        { char: "🍰", name: "shortcake", tags: "cake dessert slice sweet birthday" },
        { char: "☕", name: "hot beverage", tags: "coffee tea cafe mug hot" }
    ],
    activities: [
        { char: "⚽", name: "soccer ball", tags: "soccer football ball game sport" },
        { char: "🏀", name: "basketball", tags: "basketball ball hoop sport game" },
        { char: "🏈", name: "american football", tags: "football sport game stadium" },
        { char: "🎾", name: "tennis", tags: "tennis sport ball racket match" },
        { char: "🎮", name: "video game", tags: "game play controller playstation xbox nintendo" },
        { char: "🛹", name: "skateboard", tags: "board skate street roll" },
        { char: "✈️", name: "airplane", tags: "plane fly travel trip airport" },
        { char: "🚗", name: "automobile", tags: "car travel drive vehicle auto" },
        { char: "🏖️", name: "beach with umbrella", tags: "beach sand sun umbrella sea vacation" },
        { char: "🏔️", name: "snow-capped mountain", tags: "mountain climb ice cold height" },
        { char: "🏕️", name: "camping", tags: "camp tent forest outdoor fire" },
        { char: "🎡", name: "ferris wheel", tags: "wheel park carnival fair ride" }
    ],
    objects: [
        { char: "💡", name: "light bulb", tags: "bulb light idea smart genius" },
        { char: "💻", name: "laptop", tags: "computer laptop coder mac pc" },
        { char: "📱", name: "mobile phone", tags: "phone mobile screen call iphone" },
        { char: "🔒", name: "locked", tags: "lock secure privacy key close" },
        { char: "🔑", name: "key", tags: "key lock open access metal" },
        { char: "📚", name: "books", tags: "book study library read learn" },
        { char: "✏️", name: "pencil", tags: "pencil write draw sketch note" },
        { char: "✉️", name: "envelope", tags: "mail letter email inbox post" },
        { char: "🎨", name: "artist palette", tags: "paint draw artist color brush" },
        { char: "🎧", name: "headphones", tags: "headphone music audio sound listen" },
        { char: "📷", name: "camera", tags: "camera photo picture shutter shoot" },
        { char: "🔋", name: "battery", tags: "battery power charge energy full" }
    ],
    symbols: [
        { char: "❤️", name: "red heart", tags: "heart love like red" },
        { char: "💖", name: "sparkling heart", tags: "heart love spark sweet pink" },
        { char: "✨", name: "sparkles", tags: "spark magic clean bright gold" },
        { char: "⭐", name: "star", tags: "star yellow bright sky space" },
        { char: "🌟", name: "glowing star", tags: "star shine space bright" },
        { char: "💢", name: "anger symbol", tags: "anger anime mad pop" },
        { char: "💥", name: "collision", tags: "boom blast explode crash" },
        { char: "💤", name: "zzz", tags: "sleep sleep snore tired" },
        { char: "⚠️", name: "warning", tags: "warn alert exclamation yellow sign" },
        { char: "⛔", name: "no entry", tags: "stop block warning road sign" },
        { char: "📍", name: "round pushpin", tags: "pin map point location" },
        { char: "📌", name: "pushpin", tags: "pin post board note keep" }
    ]
};

const KAOMOJI_DB = {
    happy: [
        "(*^.^*)", "(づ｡◕‿‿◕｡)づ", "ヘ( ^o^)ノ＼(^_^ )", "(❁´◡`❁)",
        "(^///^)", "＼(￣▽￣)／", "(★≧▽^))★☆", "o(≧▽≦)o",
        "(＠＾◡＾)", "(⌒‿⌒)", "(＾▽＾)", "(*^ω^*)"
    ],
    sad: [
        "(;_;)", "(ಥ_ಥ)", "(╥﹏╥)", "(っ- ＿ ＿ 冷却 )っ",
        "(-_-)", "(ーー;)", "(._. )", "(/ _ ; )",
        "(｡>﹏<｡)", "(T_T)", "(︶︹︶)", "(*T_T*)"
    ],
    anger: [
        "(#`皿´)", "(╬`益´)", "( ╬ ﾟ 益 ﾟ )", "(＃ﾟДﾟ)",
        "凸(｀△´＋)", "( ﾟДﾟ)σ", "(`へ´*)", "(╬▔皿▔)╯",
        "( ಠ 益 ಠ )", "ヽ( `д´*)ノ", "(`A´)", "( ╬ ◣ ◢)"
    ],
    surprised: [
        "(((⊙o⊙)))", "(・_・;)", "Σ(￣□￣||)", "(‘◇’)",
        "(゜-゜)", "(^◇^;)", "(⊙_⊙)", "(・∀・)",
        "(;・∀・)", "(ﾟДﾟ;)", "(。_。;)", "w(ﾟｏﾟ)w"
    ],
    greeting: [
        "(^-^*)ノ", "(^_-)☆", "( ´ ▽ ` )ﾉ", "(*・_・)ノ",
        "(=^･^=)ノ", "ヘ(^_^ヘ)", "(￣▽￣)ノ", "( °ヮ° )ノ",
        "ヾ(＾-＾)ノ", "(。・_・。)ノ", "(✿ヘᴥヘ)ノ", "(*￣▽￣)d"
    ],
    animals: [
        "(=^･^=)", "(=^..^=)", "(=①ω①=)", "(=^ ◡ ^=)",
        "(=;ェ;=)", "(=^･ｪ･^=)", "ʕ•ᴥ•ʔ", "ʕ •́؈•̀ ʔ",
        "(￣(ｴ)￣)", "(´(ｪ)｀)", "＼(￣(ｴ)￣)／", "(*￣(ｴ)￣*)"
    ]
};

const SYMBOLS_DB = {
    punctuation: [
        "—", "–", "…", "“", "”", "‘", "’", "«", "»", "•",
        "·", "†", "‡", "§", "¶", "¡", "¿", "‽", "⁑", "⁂"
    ],
    currency: [
        "$", "¢", "£", "¤", "¥", "₣", "₤", "₧", "₨", "₩",
        "₪", "₫", "€", "₭", "₮", "₯", "₰", "₱", "₲", "₳",
        "₹", "₺", "₽"
    ],
    math: [
        "+", "−", "×", "÷", "=", "≠", "≈", "≅", "∝", "≡",
        "<", ">", "≤", "≥", "±", "∓", "¬", "¼", "½", "¾",
        "π", "∞", "∑", "∏", "√", "∆"
    ],
    geometric: [
        "■", "□", "▲", "△", "▼", "▽", "◆", "◇", "○", "◎",
        "●", "◯", "★", "☆", "✓", "✗", "✦", "✧", "❂", "⚙"
    ],
    arrows: [
        "←", "↑", "→", "↓", "↔", "↕", "↖", "↗", "↘", "↙",
        "↚", "↛", "↜", "↝", "↞", "↟", "↠", "↡", "↢", "↣"
    ]
};

// 2. Fallback Trending GIFs (Direct links of popular Giphy reaction GIFs)
const FALLBACK_GIFS = [
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHB1NmIwaXZrbDZlM3N4bzhocTF5bTh5OWpxbzV6cjZodmppMXBqbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3q2zVr6cu95nF6O4/giphy.gif", title: "Excited clap" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzhqMXVnYzd3NXpwYmd3cWxhb3FpYTc0dzRwZTZ1MXpxODZlNGphYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSjRrfIPjei1nG/giphy.gif", title: "Thumbs up" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGlqd3d1Z21jZmF3OXJtOXExYTZmdTJyMDd0czFzNGdwdHR5MmY4bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26vUxArW9J12SST4c/giphy.gif", title: "Wave hello" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHFpNHJmNGM4Z2pxMGdyZHFma3hpNHFwaDNybXF3MGZtYWZ5eDJxZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0ExdHfRKRUsY4G7S/giphy.gif", title: "Slight smile cat" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzh5eXlmd2JpODR0dzhwZTA0dWNodjFqbmpxZjJyeTFocGNpYW03YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3q2zZ2c4R93pXG12/giphy.gif", title: "Mind blown" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJ2NHZ1b2E4aThrcGpmZ2U4N2J6M2phZWNqZzF0ODl5cnZtdXZ5NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/5GovlcmK2QG5y/giphy.gif", title: "Overwhelmed joy" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2R4eXRscXUzaHhhcmY2eXFmMDkyYnRsaDNobnQydWR0ajdya2UwaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l41YtZOb9EUABqjcc/giphy.gif", title: "Aha! Idea" },
    { url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2QydDNvN2t4bXR5Y2tnaTB5bmZ6czdyOXNkbTJrbzN6ZTA1cjRldyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3NtY188QaxDdC/giphy.gif", title: "Tired sleep" }
];

// 3. Mock Clipboard Initial History (with local images generated/placed later)
let MOCK_CLIPBOARD = [
    { id: 1, type: "text", content: "const fetchGifs = async () => {\n  const response = await fetch(url);\n  return response.json();\n};", pinned: true, timestamp: "Just now" },
    { id: 2, type: "image", content: "images/code_editor.png", title: "Code Editor Screenshot", pinned: false, timestamp: "5 mins ago" },
    { id: 3, type: "text", content: "Glyphr is the ultimate keyboard-first glassmorphism clipboard picker panel.", pinned: false, timestamp: "10 mins ago" },
    { id: 4, type: "image", content: "images/pixel_cat.png", title: "Pixel Cat Asset", pinned: false, timestamp: "1 hour ago" },
    { id: 5, type: "text", content: "https://github.com/google/deepmind", pinned: false, timestamp: "2 hours ago" }
];

// 4. State Management
let activeTab = "clipboard";
let currentFocusedIndex = -1;
let currentFocusableItems = [];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    renderClipboard();
    renderEmojis("smileys");
    renderGIFs();
    renderKaomoji("happy");
    renderSymbols("punctuation");
    setupEventListeners();
    updateFocusableItems();
});

// Load Settings from LocalStorage
function loadSettings() {
    const savedKey = localStorage.getItem("tenor_api_key");
    if (savedKey) {
        document.getElementById("tenor-api-key").value = savedKey;
    }
}

// 5. Rendering Functions

// Render Clipboard cards
function renderClipboard() {
    const container = document.getElementById("clipboard-list-container");
    const emptyState = document.getElementById("clipboard-empty-state");

    // Remove existing card elements
    const cards = container.querySelectorAll(".clipboard-card");
    cards.forEach(card => card.remove());

    if (MOCK_CLIPBOARD.length === 0) {
        emptyState.style.display = "flex";
        return;
    }
    emptyState.style.display = "none";

    // Sort: Pinned first
    const sortedHistory = [...MOCK_CLIPBOARD].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
    });

    sortedHistory.forEach(item => {
        const card = document.createElement("div");
        card.className = `clipboard-card${item.pinned ? ' pinned' : ''}`;
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.setAttribute("data-id", item.id);
        
        let contentHtml = "";
        if (item.type === "text") {
            contentHtml = `<div class="card-content">${escapeHtml(item.content)}</div>`;
        } else {
            contentHtml = `
                <div class="card-content">${item.title}</div>
                <img class="card-image" src="${item.content}" alt="${item.title}">
            `;
        }

        card.innerHTML = `
            ${contentHtml}
            <div class="card-footer">
                <span>${item.timestamp}</span>
                <div class="card-actions">
                    <button class="action-icon pinned-btn${item.pinned ? ' active' : ''}" title="${item.pinned ? 'Unpin' : 'Pin'}" aria-label="Pin">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.33-2.9A2 2 0 0 1 15 9.86V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.86c0 .42-.13.83-.37 1.15l-2.33 2.9A2 2 0 0 0 5 15.24z"></path></svg>
                    </button>
                    <button class="action-icon delete-btn" title="Delete" aria-label="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
        `;

        // Card copy handler
        card.addEventListener("click", (e) => {
            if (e.target.closest(".action-icon")) return; // Skip if action button clicked
            if (item.type === "text") {
                copyText(item.content);
            } else {
                copyImage(item.content);
            }
        });

        // Pin handler
        card.querySelector(".pinned-btn").addEventListener("click", () => {
            togglePin(item.id);
        });

        // Delete handler
        card.querySelector(".delete-btn").addEventListener("click", () => {
            deleteItem(item.id);
        });

        container.appendChild(card);
    });
}

// Render Emoji grid
function renderEmojis(category, filter = "") {
    const grid = document.getElementById("emoji-grid-container");
    grid.innerHTML = "";

    let emojis = [];
    if (filter) {
        // Search all categories
        Object.values(EMOJI_DB).forEach(catEmojis => {
            emojis.push(...catEmojis.filter(e => 
                e.name.toLowerCase().includes(filter.toLowerCase()) || 
                e.tags.toLowerCase().includes(filter.toLowerCase())
            ));
        });
    } else {
        emojis = EMOJI_DB[category] || [];
    }

    if (emojis.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: span 6; margin-top: 10px;"><p class="empty-title">No emojis found</p></div>`;
        return;
    }

    emojis.forEach(emoji => {
        const btn = document.createElement("button");
        btn.className = "emoji-item";
        btn.setAttribute("title", emoji.name);
        btn.setAttribute("aria-label", emoji.name);
        btn.textContent = emoji.char;
        btn.addEventListener("click", () => copyText(emoji.char));
        grid.appendChild(btn);
    });
}

// Render GIFs (Tenor integration)
async function renderGIFs(query = "") {
    const container = document.getElementById("gif-grid-container");
    container.innerHTML = "";

    const key = localStorage.getItem("tenor_api_key");

    if (key) {
        // Show loading state
        container.innerHTML = `<div class="empty-state" style="grid-column: span 2; margin-top: 20px;"><p class="empty-title">Searching Tenor...</p></div>`;
        try {
            const limit = 8;
            const endpoint = query ? 'search' : 'featured';
            const url = `https://tenor.googleapis.com/v2/${endpoint}?key=${key}&limit=${limit}${query ? `&q=${encodeURIComponent(query)}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            
            container.innerHTML = "";
            if (data.results && data.results.length > 0) {
                data.results.forEach(result => {
                    const gifUrl = result.media_formats.tinygif.url;
                    const title = result.title || "Tenor GIF";
                    createGifCard(gifUrl, title, container);
                });
            } else {
                container.innerHTML = `<div class="empty-state" style="grid-column: span 2; margin-top: 20px;"><p class="empty-title">No GIFs found</p></div>`;
            }
            updateFocusableItems();
            return;
        } catch (err) {
            console.error("Tenor API Error, falling back to trending static: ", err);
        }
    }

    // Fallback static list (if no key or API error occurs)
    let filteredGifs = FALLBACK_GIFS;
    if (query) {
        filteredGifs = FALLBACK_GIFS.filter(gif => gif.title.toLowerCase().includes(query.toLowerCase()));
    }

    if (filteredGifs.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: span 2; margin-top: 20px;"><p class="empty-title">No GIFs found</p></div>`;
        return;
    }

    filteredGifs.forEach(gif => {
        createGifCard(gif.url, gif.title, container);
    });
}

function createGifCard(url, title, container) {
    const card = document.createElement("button");
    card.className = "gif-item";
    card.setAttribute("title", title);
    card.setAttribute("aria-label", title);
    card.innerHTML = `<img src="${url}" alt="${title}" loading="lazy">`;
    card.addEventListener("click", () => copyText(url));
    container.appendChild(card);
}

// Render Kaomojis
function renderKaomoji(category, filter = "") {
    const container = document.getElementById("kaomoji-container");
    container.innerHTML = "";

    let list = [];
    if (filter) {
        Object.values(KAOMOJI_DB).forEach(kList => {
            list.push(...kList.filter(k => k.toLowerCase().includes(filter.toLowerCase())));
        });
    } else {
        list = KAOMOJI_DB[category] || [];
    }

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: span 2; margin-top: 10px;"><p class="empty-title">No kaomojis found</p></div>`;
        return;
    }

    list.forEach(kaomoji => {
        const card = document.createElement("button");
        card.className = "kaomoji-item";
        card.textContent = kaomoji;
        card.setAttribute("title", kaomoji);
        card.setAttribute("aria-label", kaomoji);
        card.addEventListener("click", () => copyText(kaomoji));
        container.appendChild(card);
    });
}

// Render Symbols
function renderSymbols(category, filter = "") {
    const grid = document.getElementById("symbols-grid-container");
    grid.innerHTML = "";

    let list = [];
    if (filter) {
        Object.values(SYMBOLS_DB).forEach(sList => {
            list.push(...sList.filter(s => s.includes(filter)));
        });
    } else {
        list = SYMBOLS_DB[category] || [];
    }

    if (list.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: span 8; margin-top: 10px;"><p class="empty-title">No symbols found</p></div>`;
        return;
    }

    list.forEach(symbol => {
        const btn = document.createElement("button");
        btn.className = "symbol-item";
        btn.textContent = symbol;
        btn.setAttribute("title", `Symbol: ${symbol}`);
        btn.setAttribute("aria-label", symbol);
        btn.addEventListener("click", () => copyText(symbol));
        grid.appendChild(btn);
    });
}

// 6. Clipboard Actions (Pin, Delete, Clear)

function togglePin(id) {
    MOCK_CLIPBOARD = MOCK_CLIPBOARD.map(item => 
        item.id === id ? { ...item, pinned: !item.pinned } : item
    );
    renderClipboard();
    updateFocusableItems();
}

function deleteItem(id) {
    MOCK_CLIPBOARD = MOCK_CLIPBOARD.filter(item => item.id !== id);
    renderClipboard();
    updateFocusableItems();
}

function clearAll() {
    if (confirm("Are you sure you want to clear all clipboard items? Pinned items will be cleared too.")) {
        MOCK_CLIPBOARD = [];
        renderClipboard();
        updateFocusableItems();
    }
}

// 7. Clipboard Copy Logic
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copied to clipboard!");
        closePanel();
    }).catch(err => {
        console.error("Clipboard copy failed: ", err);
    });
}

function copyImage(imgSrc) {
    fetch(imgSrc)
        .then(res => res.blob())
        .then(blob => {
            const item = new ClipboardItem({ [blob.type]: blob });
            navigator.clipboard.write([item]).then(() => {
                showToast("Image copied to clipboard!");
                closePanel();
            });
        })
        .catch(err => {
            console.error("Failed to copy image: ", err);
            // Fallback: copy source path as text if image fetch fails (e.g. cross-origin/local filesystem restrictions)
            copyText(imgSrc);
        });
}

function showToast(message) {
    const toast = document.getElementById("copy-toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}

// Close Panel Animation
function closePanel() {
    const panel = document.getElementById("glyphr-panel");
    panel.classList.add("hide");
    setTimeout(() => {
        panel.classList.remove("hide"); // reset for next trigger
    }, 200);
}

// 8. Event Listeners Setup
function setupEventListeners() {
    // 1. Tab buttons click
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    // 2. Clear all button
    document.getElementById("clear-all-btn").addEventListener("click", clearAll);

    // 3. Search inputs logic
    document.getElementById("emoji-search-input").addEventListener("input", (e) => {
        const query = e.target.value;
        const activeCatBtn = document.querySelector("#emoji-category-row .cat-btn.active");
        const category = activeCatBtn ? activeCatBtn.getAttribute("data-category") : "smileys";
        renderEmojis(category, query);
        updateFocusableItems();
    });

    document.getElementById("gif-search-input").addEventListener("input", debounce((e) => {
        const query = e.target.value;
        renderGIFs(query);
    }, 400));

    // 4. Category switching within tabs
    // Emoji Categories
    document.querySelectorAll("#emoji-category-row .cat-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#emoji-category-row .cat-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("emoji-search-input").value = "";
            renderEmojis(btn.getAttribute("data-category"));
            updateFocusableItems();
        });
    });

    // Kaomoji Categories
    document.querySelectorAll("#kaomoji-category-row .cat-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#kaomoji-category-row .cat-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderKaomoji(btn.getAttribute("data-category"));
            updateFocusableItems();
        });
    });

    // Symbols Categories
    document.querySelectorAll("#symbols-category-row .cat-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#symbols-category-row .cat-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderSymbols(btn.getAttribute("data-category"));
            updateFocusableItems();
        });
    });

    // Settings save button
    document.getElementById("save-settings-btn").addEventListener("click", () => {
        const key = document.getElementById("tenor-api-key").value.trim();
        const status = document.getElementById("settings-status");
        
        localStorage.setItem("tenor_api_key", key);
        status.textContent = "API key saved successfully!";
        status.className = "status-msg success";
        setTimeout(() => status.textContent = "", 3000);
        
        // Reload GIFs with the new key
        renderGIFs();
    });

    // 5. Keyboard Navigation Event Listeners
    document.addEventListener("keydown", handleGlobalKeydown);
}

// Tab Switching Helper
function switchTab(tabId) {
    activeTab = tabId;
    
    // Update active state in tabs
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach(b => {
        const isActive = b.getAttribute("data-tab") === tabId;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    // Show/hide content panels
    const contents = document.querySelectorAll(".tab-content");
    contents.forEach(c => {
        c.classList.toggle("active", c.getAttribute("id") === `content-${tabId}`);
    });

    // Focus initial search bar or list item
    const searchBar = document.querySelector(`#content-${tabId} .search-bar`);
    if (searchBar) {
        searchBar.focus();
    } else {
        // If no search bar (e.g. Settings, Clipboard), focus first focusable item
        updateFocusableItems();
        if (currentFocusableItems.length > 0) {
            currentFocusedIndex = 0;
            currentFocusableItems[0].focus();
        }
    }

    updateFocusableItems();
}

// 9. Keyboard Navigation Logic

// Update list of currently active focusable items on the screen
function updateFocusableItems() {
    let selector = "";
    if (activeTab === "clipboard") {
        selector = "#content-clipboard .clipboard-card, #clear-all-btn";
    } else if (activeTab === "emoji") {
        selector = "#emoji-search-input, #emoji-category-row .cat-btn, #emoji-grid-container .emoji-item";
    } else if (activeTab === "gif") {
        selector = "#gif-search-input, #gif-grid-container .gif-item";
    } else if (activeTab === "kaomoji") {
        selector = "#kaomoji-category-row .cat-btn, #kaomoji-container .kaomoji-item";
    } else if (activeTab === "symbols") {
        selector = "#symbols-category-row .cat-btn, #symbols-grid-container .symbol-item";
    } else if (activeTab === "settings") {
        selector = "#tenor-api-key, #save-settings-btn";
    }

    currentFocusableItems = Array.from(document.querySelectorAll(selector));
    currentFocusedIndex = currentFocusableItems.indexOf(document.activeElement);
}

function handleGlobalKeydown(e) {
    updateFocusableItems();

    // 1. Esc to close
    if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
        return;
    }

    // 2. Ctrl+Tab (Next Tab), Ctrl+Shift+Tab / Ctrl+Backtab (Previous Tab)
    if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        const tabBtns = Array.from(document.querySelectorAll(".tab-btn"));
        const activeIndex = tabBtns.findIndex(btn => btn.getAttribute("data-tab") === activeTab);
        
        let nextIndex;
        if (e.shiftKey) {
            nextIndex = (activeIndex - 1 + tabBtns.length) % tabBtns.length;
        } else {
            nextIndex = (activeIndex + 1) % tabBtns.length;
        }
        
        const nextTabId = tabBtns[nextIndex].getAttribute("data-tab");
        switchTab(nextTabId);
        return;
    }

    // 3. Arrow Keys traversal
    if (["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)) {
        if (currentFocusableItems.length === 0) return;
        
        e.preventDefault();
        
        const columns = getGridColumns();
        let nextIndex = currentFocusedIndex;

        switch (e.key) {
            case "ArrowDown":
                if (currentFocusedIndex === -1) {
                    nextIndex = 0;
                } else if (columns > 1) {
                    // Grid navigation Down
                    nextIndex = Math.min(currentFocusedIndex + columns, currentFocusableItems.length - 1);
                } else {
                    // List navigation Down
                    nextIndex = Math.min(currentFocusedIndex + 1, currentFocusableItems.length - 1);
                }
                break;
            case "ArrowUp":
                if (currentFocusedIndex === -1) {
                    nextIndex = 0;
                } else if (columns > 1) {
                    // Grid navigation Up
                    nextIndex = Math.max(currentFocusedIndex - columns, 0);
                } else {
                    // List navigation Up
                    nextIndex = Math.max(currentFocusedIndex - 1, 0);
                }
                break;
            case "ArrowRight":
                if (currentFocusedIndex === -1) {
                    nextIndex = 0;
                } else {
                    nextIndex = Math.min(currentFocusedIndex + 1, currentFocusableItems.length - 1);
                }
                break;
            case "ArrowLeft":
                if (currentFocusedIndex === -1) {
                    nextIndex = 0;
                } else {
                    nextIndex = Math.max(currentFocusedIndex - 1, 0);
                }
                break;
        }

        if (nextIndex !== currentFocusedIndex && nextIndex >= 0 && nextIndex < currentFocusableItems.length) {
            currentFocusedIndex = nextIndex;
            currentFocusableItems[currentFocusedIndex].focus();
            
            // Scroll into view if needed
            currentFocusableItems[currentFocusedIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }
}

// Returns the column layout for grids based on current active tab
function getGridColumns() {
    if (activeTab === "emoji") {
        // Categories have 6 items, grid has 6 columns
        return 6;
    } else if (activeTab === "symbols") {
        // Symbols grid has 8 columns
        return 8;
    } else if (activeTab === "kaomoji") {
        // Kaomoji pills are in 2 columns
        return 2;
    } else if (activeTab === "gif") {
        // GIF grid has 2 columns
        return 2;
    }
    return 1; // List layouts
}

// Debounce helper for inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Escape HTML entities to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
