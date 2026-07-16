// Offline character catalog. Names and grouping follow common Unicode/CLDR wording.
// Glyph appearance comes from the user's installed emoji font, preferring Noto Color Emoji on Linux.
const makeCatalog = rows => rows.map(([value, name, category]) => ({ value, name, category }));

export const emoji = makeCatalog([
  ["😀", "grinning face", "smileys"], ["😃", "grinning face with big eyes", "smileys"], ["😄", "grinning face with smiling eyes", "smileys"], ["😁", "beaming face", "smileys"],
  ["😆", "grinning squinting face", "smileys"], ["😅", "grinning face with sweat", "smileys"], ["🤣", "rolling on the floor laughing", "smileys"], ["😂", "face with tears of joy", "smileys"],
  ["🙂", "slightly smiling face", "smileys"], ["🙃", "upside-down face", "smileys"], ["🫠", "melting face", "smileys"], ["😉", "winking face", "smileys"],
  ["😊", "smiling face with smiling eyes", "smileys"], ["😇", "smiling face with halo", "smileys"], ["🥰", "smiling face with hearts", "smileys"], ["😍", "smiling face with heart-eyes", "smileys"],
  ["🤩", "star-struck", "smileys"], ["😘", "face blowing a kiss", "smileys"], ["😋", "face savoring food", "smileys"], ["😎", "smiling face with sunglasses", "smileys"],
  ["🤓", "nerd face", "smileys"], ["🧐", "face with monocle", "smileys"], ["🥳", "partying face", "smileys"], ["🥹", "face holding back tears", "smileys"],
  ["😏", "smirking face", "smileys"], ["😌", "relieved face", "smileys"], ["😔", "pensive face", "smileys"], ["😴", "sleeping face", "smileys"],
  ["🤤", "drooling face", "smileys"], ["🤔", "thinking face", "smileys"], ["🫡", "saluting face", "smileys"], ["🤗", "hugging face", "smileys"],
  ["🤭", "face with hand over mouth", "smileys"], ["🫢", "face with open eyes and hand over mouth", "smileys"], ["🤫", "shushing face", "smileys"], ["🤥", "lying face", "smileys"],
  ["😶", "face without mouth", "smileys"], ["😐", "neutral face", "smileys"], ["😑", "expressionless face", "smileys"], ["🙄", "face with rolling eyes", "smileys"],
  ["😬", "grimacing face", "smileys"], ["😮", "face with open mouth", "smileys"], ["😲", "astonished face", "smileys"], ["🥺", "pleading face", "smileys"],
  ["😭", "loudly crying face", "smileys"], ["😤", "face with steam from nose", "smileys"], ["😡", "enraged face", "smileys"], ["🤯", "exploding head", "smileys"],

  ["👋", "waving hand", "people"], ["🤚", "raised back of hand", "people"], ["🖐️", "hand with fingers splayed", "people"], ["✋", "raised hand", "people"],
  ["🖖", "vulcan salute", "people"], ["🫱", "rightwards hand", "people"], ["🫲", "leftwards hand", "people"], ["👌", "OK hand", "people"],
  ["🤌", "pinched fingers", "people"], ["🤏", "pinching hand", "people"], ["✌️", "victory hand", "people"], ["🤞", "crossed fingers", "people"],
  ["🫰", "hand with index finger and thumb crossed", "people"], ["🤟", "love-you gesture", "people"], ["🤘", "sign of the horns", "people"], ["🤙", "call me hand", "people"],
  ["👈", "backhand index pointing left", "people"], ["👉", "backhand index pointing right", "people"], ["👆", "backhand index pointing up", "people"], ["👇", "backhand index pointing down", "people"],
  ["☝️", "index pointing up", "people"], ["🫵", "index pointing at viewer", "people"], ["👍", "thumbs up", "people"], ["👎", "thumbs down", "people"],
  ["✊", "raised fist", "people"], ["👊", "oncoming fist", "people"], ["👏", "clapping hands", "people"], ["🙌", "raising hands", "people"],
  ["🫶", "heart hands", "people"], ["🤝", "handshake", "people"], ["🙏", "folded hands", "people"], ["💪", "flexed biceps", "people"],
  ["👀", "eyes", "people"], ["👁️", "eye", "people"], ["🧠", "brain", "people"], ["🫀", "anatomical heart", "people"],
  ["👶", "baby", "people"], ["🧑", "person", "people"], ["👩", "woman", "people"], ["👨", "man", "people"],
  ["🧑‍💻", "technologist", "people"], ["🧑‍🎨", "artist", "people"], ["🧑‍🚀", "astronaut", "people"], ["🦸", "superhero", "people"],

  ["🐶", "dog face", "animals"], ["🐱", "cat face", "animals"], ["🐭", "mouse face", "animals"], ["🐹", "hamster", "animals"],
  ["🐰", "rabbit face", "animals"], ["🦊", "fox", "animals"], ["🐻", "bear", "animals"], ["🐼", "panda", "animals"],
  ["🐨", "koala", "animals"], ["🐯", "tiger face", "animals"], ["🦁", "lion", "animals"], ["🐮", "cow face", "animals"],
  ["🐷", "pig face", "animals"], ["🐸", "frog", "animals"], ["🐵", "monkey face", "animals"], ["🙈", "see-no-evil monkey", "animals"],
  ["🙉", "hear-no-evil monkey", "animals"], ["🙊", "speak-no-evil monkey", "animals"], ["🐔", "chicken", "animals"], ["🐧", "penguin", "animals"],
  ["🐦", "bird", "animals"], ["🦄", "unicorn", "animals"], ["🐝", "honeybee", "animals"], ["🦋", "butterfly", "animals"],
  ["🐢", "turtle", "animals"], ["🐙", "octopus", "animals"], ["🐬", "dolphin", "animals"], ["🐳", "spouting whale", "animals"],
  ["🌱", "seedling", "animals"], ["🌿", "herb", "animals"], ["🍀", "four leaf clover", "animals"], ["🌻", "sunflower", "animals"],
  ["🌈", "rainbow", "animals"], ["🌊", "water wave", "animals"], ["☀️", "sun", "animals"], ["🌙", "crescent moon", "animals"],

  ["🍏", "green apple", "food"], ["🍎", "red apple", "food"], ["🍓", "strawberry", "food"], ["🍉", "watermelon", "food"],
  ["🍌", "banana", "food"], ["🍍", "pineapple", "food"], ["🥭", "mango", "food"], ["🍇", "grapes", "food"],
  ["🥑", "avocado", "food"], ["🍕", "pizza", "food"], ["🍔", "hamburger", "food"], ["🍟", "french fries", "food"],
  ["🌮", "taco", "food"], ["🍜", "steaming bowl", "food"], ["🍣", "sushi", "food"], ["🍰", "shortcake", "food"],
  ["🎂", "birthday cake", "food"], ["🍫", "chocolate bar", "food"], ["🍿", "popcorn", "food"], ["☕", "hot beverage coffee", "food"],
  ["🧋", "bubble tea", "food"], ["🥤", "cup with straw", "food"], ["🍺", "beer mug", "food"], ["🍽️", "fork and knife with plate", "food"],

  ["🚗", "automobile", "travel"], ["🚕", "taxi", "travel"], ["🚌", "bus", "travel"], ["🚲", "bicycle", "travel"],
  ["✈️", "airplane", "travel"], ["🚀", "rocket", "travel"], ["🚁", "helicopter", "travel"], ["🚆", "train", "travel"],
  ["⛵", "sailboat", "travel"], ["🏠", "house", "travel"], ["🏢", "office building", "travel"], ["🏖️", "beach with umbrella", "travel"],
  ["🏔️", "snow-capped mountain", "travel"], ["🗺️", "world map", "travel"], ["📍", "round pushpin", "travel"], ["🌍", "globe showing Europe-Africa", "travel"],

  ["⚽", "soccer ball", "activities"], ["🏀", "basketball", "activities"], ["🏏", "cricket game", "activities"], ["🎾", "tennis", "activities"],
  ["🏆", "trophy", "activities"], ["🥇", "gold medal", "activities"], ["🎯", "bullseye", "activities"], ["🎮", "video game", "activities"],
  ["🎨", "artist palette", "activities"], ["🎵", "musical note", "activities"], ["🎸", "guitar", "activities"], ["🎬", "clapper board", "activities"],
  ["🎉", "party popper", "activities"], ["🎊", "confetti ball", "activities"], ["🎁", "wrapped gift", "activities"], ["🧩", "puzzle piece", "activities"],

  ["📱", "mobile phone", "objects"], ["💻", "laptop", "objects"], ["⌨️", "keyboard", "objects"], ["🖥️", "desktop computer", "objects"],
  ["📷", "camera", "objects"], ["💡", "light bulb", "objects"], ["🔦", "flashlight", "objects"], ["📚", "books", "objects"],
  ["📝", "memo", "objects"], ["📌", "pushpin", "objects"], ["📎", "paperclip", "objects"], ["📅", "calendar", "objects"],
  ["📈", "chart increasing", "objects"], ["📦", "package", "objects"], ["🔒", "locked", "objects"], ["🔑", "key", "objects"],
  ["🔧", "wrench", "objects"], ["⚙️", "gear", "objects"], ["🧲", "magnet", "objects"], ["🧪", "test tube", "objects"],

  ["❤️", "red heart", "symbols"], ["🩷", "pink heart", "symbols"], ["🧡", "orange heart", "symbols"], ["💛", "yellow heart", "symbols"],
  ["💚", "green heart", "symbols"], ["💙", "blue heart", "symbols"], ["💜", "purple heart", "symbols"], ["🖤", "black heart", "symbols"],
  ["🤍", "white heart", "symbols"], ["💔", "broken heart", "symbols"], ["💕", "two hearts", "symbols"], ["💖", "sparkling heart", "symbols"],
  ["✨", "sparkles", "symbols"], ["🔥", "fire", "symbols"], ["💯", "hundred points", "symbols"], ["✅", "check mark button", "symbols"],
  ["❌", "cross mark", "symbols"], ["⚠️", "warning", "symbols"], ["❓", "question mark", "symbols"], ["‼️", "double exclamation mark", "symbols"],
  ["♻️", "recycling symbol", "symbols"], ["🔴", "red circle", "symbols"], ["🟢", "green circle", "symbols"], ["⭐", "star", "symbols"],

  ["🏳️", "white flag", "flags"], ["🏴", "black flag", "flags"], ["🏁", "chequered flag", "flags"], ["🚩", "triangular flag", "flags"],
  ["🇮🇳", "flag India", "flags"], ["🇺🇸", "flag United States", "flags"], ["🇬🇧", "flag United Kingdom", "flags"], ["🇨🇦", "flag Canada", "flags"],
  ["🇦🇺", "flag Australia", "flags"], ["🇯🇵", "flag Japan", "flags"], ["🇩🇪", "flag Germany", "flags"], ["🇫🇷", "flag France", "flags"],
  ["🇮🇹", "flag Italy", "flags"], ["🇧🇷", "flag Brazil", "flags"], ["🇰🇷", "flag South Korea", "flags"], ["🇿🇦", "flag South Africa", "flags"]
]);

export const kaomoji = makeCatalog([
  ["(＾▽＾)", "happy", "happy"], ["(◕‿◕)", "smile", "happy"], ["(⌒‿⌒)", "content", "happy"], ["(•‿•)", "friendly", "happy"],
  ["(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧", "celebration magic", "happy"], ["♪~ ᕕ(ᐛ)ᕗ", "dancing", "happy"], ["٩(◕‿◕｡)۶", "cheering", "happy"], ["ヽ(・∀・)ﾉ", "joy", "happy"],
  ["(｡♥‿♥｡)", "love", "love"], ["(づ｡◕‿‿◕｡)づ", "hug", "love"], ["(っ˘з(˘⌣˘ )", "kiss", "love"], ["♡( ◡‿◡ )", "adoring", "love"],
  ["(♡°▽°♡)", "in love", "love"], ["( ˘ ³˘)♥", "kiss heart", "love"], ["(づ￣ ³￣)づ", "sending hug", "love"], ["( ˘⌣˘)♡(˘⌣˘ )", "together", "love"],
  ["¯\\_(ツ)_/¯", "shrug", "reaction"], ["ಠ_ಠ", "disapproval", "reaction"], ["(¬‿¬)", "smirk", "reaction"], ["(－‸ლ)", "facepalm", "reaction"],
  ["(⊙_⊙)", "surprised", "reaction"], ["(⊙﹏⊙)", "worried", "reaction"], ["(⌐■_■)", "cool sunglasses", "reaction"], ["(；一_一)", "suspicious", "reaction"],
  ["(・_・;)", "awkward", "reaction"], ["(°ロ°) !", "shocked", "reaction"], ["(・・ ) ?", "confused", "reaction"], ["(￣ω￣;)", "nervous", "reaction"],
  ["(╯°□°）╯︵ ┻━┻", "table flip", "action"], ["┬─┬ ノ( ゜-゜ノ)", "table restore", "action"], ["(•̀ᴗ•́)و ̑̑", "you can do it", "action"], ["ᕦ(ò_óˇ)ᕤ", "strong", "action"],
  ["(ง'̀-'́)ง", "fight", "action"], ["(☞ﾟヮﾟ)☞", "finger guns right", "action"], ["☜(ﾟヮﾟ☜)", "finger guns left", "action"], ["ᕕ( ᐛ )ᕗ", "running", "action"],
  ["(っ˘ڡ˘ς)", "delicious", "action"], ["(￣▽￣)ノ", "hello", "action"], ["( ^_^)／", "wave", "action"], ["(-_-)/~~~", "goodbye", "action"],
  ["(￣o￣) zzZZzzZZ", "sleep", "action"], ["(☞ ͡° ͜ʖ ͡°)☞", "you got it", "action"], ["ƪ(˘⌣˘)ʃ", "dance", "action"], ["(づ◡﹏◡)づ", "comfort", "action"],
  ["(ಥ﹏ಥ)", "crying", "sad"], ["(｡•́︿•̀｡)", "sad", "sad"], ["(╥﹏╥)", "tears", "sad"], ["(っ- ‸ - ς)", "upset", "sad"],
  ["(ノ_<。)", "hurt", "sad"], ["(μ_μ)", "gloomy", "sad"], ["(｡T ω T｡)", "emotional", "sad"], ["(︶︹︺)", "disappointed", "sad"],
  ["ʕ•ᴥ•ʔ", "bear", "animals"], ["ฅ^•ﻌ•^ฅ", "cat", "animals"], ["U・ᴥ・U", "dog", "animals"], ["くコ:彡", "squid", "animals"],
  ["／(≧ x ≦)＼", "rabbit", "animals"], ["(V●ᴥ●V)", "puppy", "animals"], ["(=^･ω･^=)", "kitty", "animals"], ["ʕっ•ᴥ•ʔっ", "bear hug", "animals"]
]);

export const symbols = makeCatalog([
  ["→", "right arrow", "arrows"], ["←", "left arrow", "arrows"], ["↑", "up arrow", "arrows"], ["↓", "down arrow", "arrows"],
  ["↔", "left right arrow", "arrows"], ["↕", "up down arrow", "arrows"], ["↗", "up right arrow", "arrows"], ["↘", "down right arrow", "arrows"],
  ["↙", "down left arrow", "arrows"], ["↖", "up left arrow", "arrows"], ["⇒", "double right arrow", "arrows"], ["⇐", "double left arrow", "arrows"],
  ["⇧", "upwards white arrow", "arrows"], ["➜", "heavy round-tipped right arrow", "arrows"], ["➤", "arrowhead", "arrows"], ["⟶", "long right arrow", "arrows"],

  ["€", "euro", "currency"], ["£", "pound sterling", "currency"], ["¥", "yen yuan", "currency"], ["₹", "Indian rupee", "currency"],
  ["$", "dollar", "currency"], ["¢", "cent", "currency"], ["₽", "ruble", "currency"], ["₩", "won", "currency"],
  ["₿", "bitcoin", "currency"], ["₺", "Turkish lira", "currency"], ["₴", "hryvnia", "currency"], ["₦", "naira", "currency"],

  ["±", "plus minus", "math"], ["×", "multiply", "math"], ["÷", "divide", "math"], ["≈", "approximately", "math"],
  ["≠", "not equal", "math"], ["≤", "less than or equal", "math"], ["≥", "greater than or equal", "math"], ["∞", "infinity", "math"],
  ["√", "square root", "math"], ["∑", "sum", "math"], ["∫", "integral", "math"], ["π", "pi", "math"],
  ["∆", "delta change", "math"], ["∂", "partial differential", "math"], ["∈", "element of", "math"], ["∉", "not element of", "math"],
  ["∩", "intersection", "math"], ["∪", "union", "math"], ["⊂", "subset", "math"], ["⊃", "superset", "math"],
  ["∀", "for all", "math"], ["∃", "there exists", "math"], ["∅", "empty set", "math"], ["∴", "therefore", "math"],

  ["©", "copyright", "legal"], ["®", "registered", "legal"], ["™", "trademark", "legal"], ["℠", "service mark", "legal"],
  ["§", "section", "legal"], ["¶", "pilcrow paragraph", "legal"], ["†", "dagger", "legal"], ["‡", "double dagger", "legal"],

  ["•", "bullet", "punctuation"], ["◦", "white bullet", "punctuation"], ["…", "ellipsis", "punctuation"], ["—", "em dash", "punctuation"],
  ["–", "en dash", "punctuation"], ["“", "left double quote", "punctuation"], ["”", "right double quote", "punctuation"], ["‘", "left single quote", "punctuation"],
  ["’", "right single quote", "punctuation"], ["«", "left guillemet", "punctuation"], ["»", "right guillemet", "punctuation"], ["¿", "inverted question mark", "punctuation"],
  ["¡", "inverted exclamation mark", "punctuation"], ["※", "reference mark", "punctuation"], ["·", "middle dot", "punctuation"], ["‽", "interrobang", "punctuation"],

  ["°", "degree", "technical"], ["µ", "micro", "technical"], ["Ω", "omega ohm", "technical"], ["⌘", "command key", "technical"],
  ["⌥", "option key", "technical"], ["⌫", "delete key", "technical"], ["⏎", "return key", "technical"], ["⎋", "escape key", "technical"],
  ["⌃", "control key", "technical"], ["⇪", "caps lock", "technical"], ["⏻", "power", "technical"], ["⌁", "electric arrow", "technical"],
  ["⌀", "diameter", "technical"], ["℉", "degree Fahrenheit", "technical"], ["℃", "degree Celsius", "technical"], ["№", "numero sign", "technical"],

  ["α", "alpha", "greek"], ["β", "beta", "greek"], ["γ", "gamma", "greek"], ["δ", "delta", "greek"],
  ["ε", "epsilon", "greek"], ["θ", "theta", "greek"], ["λ", "lambda", "greek"], ["μ", "mu", "greek"],
  ["ξ", "xi", "greek"], ["Π", "capital pi", "greek"], ["ρ", "rho", "greek"], ["σ", "sigma", "greek"],
  ["φ", "phi", "greek"], ["χ", "chi", "greek"], ["ψ", "psi", "greek"], ["ω", "omega", "greek"],

  ["✓", "check mark", "marks"], ["✔", "heavy check mark", "marks"], ["✕", "multiplication x", "marks"], ["✖", "heavy multiplication x", "marks"],
  ["★", "black star", "marks"], ["☆", "white star", "marks"], ["♥", "heart suit", "marks"], ["♡", "white heart", "marks"],
  ["●", "black circle", "marks"], ["○", "white circle", "marks"], ["■", "black square", "marks"], ["□", "white square", "marks"],
  ["◆", "black diamond", "marks"], ["◇", "white diamond", "marks"], ["♠", "spade suit", "marks"], ["♣", "club suit", "marks"]
]);
