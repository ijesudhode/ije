// ============================================
// IJe Thai NLP Module - ระบบประมวลผลภาษาไทย
// Thai Natural Language Processing
// ============================================

// @ts-nocheck

// ==========================================
// THAI DICTIONARY (Basic word list)
// ==========================================

const THAI_COMMON_WORDS = new Set([
    // Greetings
    'สวัสดี', 'หวัดดี', 'ครับ', 'ค่ะ', 'คะ', 'นะ', 'จ้า', 'จ๊ะ',
    // Pronouns
    'ผม', 'ฉัน', 'คุณ', 'เขา', 'เธอ', 'มัน', 'พวก', 'เรา', 'ท่าน',
    // Common verbs
    'ไป', 'มา', 'กิน', 'ดื่ม', 'นอน', 'ทำ', 'เห็น', 'รู้', 'คิด', 'พูด', 'บอก',
    'มี', 'ไม่มี', 'เป็น', 'อยู่', 'ได้', 'ต้อง', 'จะ', 'กำลัง', 'แล้ว',
    'ให้', 'เอา', 'ใช้', 'หา', 'เจอ', 'รัก', 'ชอบ', 'เกลียด', 'กลัว',
    // Common nouns
    'บ้าน', 'รถ', 'คน', 'น้ำ', 'ข้าว', 'อาหาร', 'เงิน', 'งาน', 'ที่', 'วัน',
    'เวลา', 'ชื่อ', 'ใจ', 'มือ', 'ตา', 'หัว', 'ขา', 'ปาก', 'หู', 'จมูก',
    // Adjectives
    'ดี', 'ไม่ดี', 'สวย', 'หล่อ', 'ใหญ่', 'เล็ก', 'มาก', 'น้อย', 'เก่า', 'ใหม่',
    'ร้อน', 'เย็น', 'หนาว', 'เร็ว', 'ช้า', 'ง่าย', 'ยาก', 'ถูก', 'แพง',
    // Numbers
    'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ',
    'ยี่สิบ', 'สามสิบ', 'สี่สิบ', 'ห้าสิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน',
    // Time
    'วันนี้', 'พรุ่งนี้', 'เมื่อวาน', 'ตอนนี้', 'เช้า', 'เที่ยง', 'บ่าย', 'เย็น', 'ค่ำ', 'กลางคืน',
    // Question words
    'อะไร', 'ใคร', 'ที่ไหน', 'เมื่อไร', 'ทำไม', 'อย่างไร', 'เท่าไร', 'กี่',
    // Connectors
    'และ', 'หรือ', 'แต่', 'เพราะ', 'ถ้า', 'เมื่อ', 'ก็', 'แล้ว', 'จึง',
    // Programming terms
    'โปรแกรม', 'ฟังก์ชัน', 'ตัวแปร', 'คลาส', 'เมธอด', 'อาร์เรย์', 'ลูป', 'เงื่อนไข'
]);

// ==========================================
// THAI CONSONANTS & VOWELS
// ==========================================

const THAI_CONSONANTS = 'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ';
const THAI_VOWELS = 'ะาิีึืุูเแโใไ็่้๊๋ำ';
const THAI_TONES = '่้๊๋';
const THAI_SPECIAL = 'ๆฯ';

// ==========================================
// ROMANIZATION MAP (Royal Thai General System)
// ==========================================

const CONSONANT_INITIALS: Record<string, string> = {
    'ก': 'k', 'ข': 'kh', 'ฃ': 'kh', 'ค': 'kh', 'ฅ': 'kh', 'ฆ': 'kh',
    'ง': 'ng', 'จ': 'ch', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's', 'ฌ': 'ch',
    'ญ': 'y', 'ฎ': 'd', 'ฏ': 't', 'ฐ': 'th', 'ฑ': 'th', 'ฒ': 'th',
    'ณ': 'n', 'ด': 'd', 'ต': 't', 'ถ': 'th', 'ท': 'th', 'ธ': 'th',
    'น': 'n', 'บ': 'b', 'ป': 'p', 'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph',
    'ฟ': 'f', 'ภ': 'ph', 'ม': 'm', 'ย': 'y', 'ร': 'r', 'ล': 'l',
    'ว': 'w', 'ศ': 's', 'ษ': 's', 'ส': 's', 'ห': 'h', 'ฬ': 'l',
    'อ': '', 'ฮ': 'h'
};

const CONSONANT_FINALS: Record<string, string> = {
    'ก': 'k', 'ข': 'k', 'ค': 'k', 'ฆ': 'k',
    'ง': 'ng',
    'จ': 't', 'ช': 't', 'ซ': 't', 'ฌ': 't',
    'ญ': 'n', 'ณ': 'n', 'น': 'n', 'ร': 'n', 'ล': 'n', 'ฬ': 'n',
    'ด': 't', 'ต': 't', 'ถ': 't', 'ท': 't', 'ธ': 't',
    'บ': 'p', 'ป': 'p', 'พ': 'p', 'ฟ': 'p', 'ภ': 'p',
    'ม': 'm',
    'ย': 'i', 'ว': 'o',
    'ศ': 't', 'ษ': 't', 'ส': 't'
};

// ==========================================
// THAI NUMBER WORDS
// ==========================================

const THAI_DIGITS: Record<string, number> = {
    '๐': 0, '๑': 1, '๒': 2, '๓': 3, '๔': 4,
    '๕': 5, '๖': 6, '๗': 7, '๘': 8, '๙': 9
};

const THAI_NUMBER_WORDS: Record<string, number> = {
    'ศูนย์': 0, 'หนึ่ง': 1, 'เอ็ด': 1, 'สอง': 2, 'ยี่': 2,
    'สาม': 3, 'สี่': 4, 'ห้า': 5, 'หก': 6,
    'เจ็ด': 7, 'แปด': 8, 'เก้า': 9, 'สิบ': 10,
    'ร้อย': 100, 'พัน': 1000, 'หมื่น': 10000,
    'แสน': 100000, 'ล้าน': 1000000
};

const DIGIT_TO_THAI = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];

// ==========================================
// MAIN MODULE
// ==========================================

export const thaiModule = {
    // ==========================================
    // ตัด - Word Segmentation
    // ==========================================
    tat: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return segmentThai(text);
        }
    },
    segment: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return segmentThai(text);
        }
    },

    // ==========================================
    // โรมัน - Romanization
    // ==========================================
    roman: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return romanize(text);
        }
    },
    romanize: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return romanize(text);
        }
    },

    // ==========================================
    // เลขเป็นคำ - Number to Thai Text
    // ==========================================
    lekPenKum: {
        type: 'native',
        call: (args: any[]) => {
            const num = Number(args[0] || 0);
            return numberToThaiText(num);
        }
    },
    numToText: {
        type: 'native',
        call: (args: any[]) => {
            const num = Number(args[0] || 0);
            return numberToThaiText(num);
        }
    },

    // ==========================================
    // คำเป็นเลข - Thai Text to Number
    // ==========================================
    kumPenLek: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return thaiTextToNumber(text);
        }
    },
    textToNum: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return thaiTextToNumber(text);
        }
    },

    // ==========================================
    // พยัญชนะ - Is Consonant
    // ==========================================
    phaYanChaNa: {
        type: 'native',
        call: (args: any[]) => {
            const char = String(args[0] || '');
            return isConsonant(char);
        }
    },
    isConsonant: {
        type: 'native',
        call: (args: any[]) => {
            const char = String(args[0] || '');
            return isConsonant(char);
        }
    },

    // ==========================================
    // สระ - Is Vowel
    // ==========================================
    sara: {
        type: 'native',
        call: (args: any[]) => {
            const char = String(args[0] || '');
            return isVowel(char);
        }
    },
    isVowel: {
        type: 'native',
        call: (args: any[]) => {
            const char = String(args[0] || '');
            return isVowel(char);
        }
    },

    // ==========================================
    // วรรณยุกต์ - Is Tone Mark
    // ==========================================
    wanYuk: {
        type: 'native',
        call: (args: any[]) => {
            const char = String(args[0] || '');
            return isToneMark(char);
        }
    },
    isTone: {
        type: 'native',
        call: (args: any[]) => {
            const char = String(args[0] || '');
            return isToneMark(char);
        }
    },

    // ==========================================
    // ไทย? - Is Thai Text
    // ==========================================
    penThai: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return isThaiText(text);
        }
    },
    isThai: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return isThaiText(text);
        }
    },

    // ==========================================
    // นับพยางค์ - Count Syllables
    // ==========================================
    napPhaYang: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return countSyllables(text);
        }
    },
    countSyllables: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return countSyllables(text);
        }
    },

    // ==========================================
    // แปลงเลขไทย - Convert Thai Digits
    // ==========================================
    plaengLekThai: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return convertThaiDigits(text);
        }
    },
    convertDigits: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return convertThaiDigits(text);
        }
    },

    // ==========================================
    // เลขเป็นเลขไทย - To Thai Digits
    // ==========================================
    penLekThai: {
        type: 'native',
        call: (args: any[]) => {
            const num = String(args[0] || '');
            return toThaiDigits(num);
        }
    },
    toThaiDigits: {
        type: 'native',
        call: (args: any[]) => {
            const num = String(args[0] || '');
            return toThaiDigits(num);
        }
    },

    // ==========================================
    // ลบวรรณยุกต์ - Remove Tone Marks
    // ==========================================
    lopWanYuk: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return removeToneMarks(text);
        }
    },
    removeTones: {
        type: 'native',
        call: (args: any[]) => {
            const text = String(args[0] || '');
            return removeToneMarks(text);
        }
    }
};

// ==========================================
// IMPLEMENTATION FUNCTIONS
// ==========================================

function segmentThai(text: string): string[] {
    const words: string[] = [];
    let i = 0;

    while (i < text.length) {
        // Skip whitespace
        if (/\s/.test(text[i])) {
            i++;
            continue;
        }

        // Try to match longest word first
        let matched = false;
        const maxLen = Math.min(20, text.length - i);

        for (let len = maxLen; len > 0; len--) {
            const candidate = text.substring(i, i + len);

            if (THAI_COMMON_WORDS.has(candidate)) {
                words.push(candidate);
                i += len;
                matched = true;
                break;
            }
        }

        if (!matched) {
            // Single character or unknown word handling
            let word = '';
            while (i < text.length && !THAI_COMMON_WORDS.has(text.substring(i, i + 2))) {
                if (/\s/.test(text[i])) break;
                word += text[i];
                i++;
            }
            if (word) words.push(word);
        }
    }

    return words;
}

function romanize(text: string): string {
    let result = '';
    let i = 0;

    while (i < text.length) {
        const char = text[i];

        // Handle consonants
        if (CONSONANT_INITIALS[char] !== undefined) {
            result += CONSONANT_INITIALS[char];
        }
        // Handle vowels (simplified)
        else if (isVowel(char)) {
            switch (char) {
                case 'ะ': result += 'a'; break;
                case 'า': result += 'a'; break;
                case 'ิ': result += 'i'; break;
                case 'ี': result += 'i'; break;
                case 'ึ': result += 'ue'; break;
                case 'ื': result += 'ue'; break;
                case 'ุ': result += 'u'; break;
                case 'ู': result += 'u'; break;
                case 'เ': result += 'e'; break;
                case 'แ': result += 'ae'; break;
                case 'โ': result += 'o'; break;
                case 'ใ': result += 'ai'; break;
                case 'ไ': result += 'ai'; break;
                case 'ำ': result += 'am'; break;
                // Skip tone marks in romanization
                case '็': case '่': case '้': case '๊': case '๋': break;
            }
        }
        // Handle spaces
        else if (/\s/.test(char)) {
            result += ' ';
        }
        // Pass through other characters
        else if (/[a-zA-Z0-9]/.test(char)) {
            result += char;
        }

        i++;
    }

    return result.trim();
}

function numberToThaiText(num: number): string {
    if (num === 0) return 'ศูนย์';
    if (num < 0) return 'ลบ' + numberToThaiText(-num);

    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    let result = '';
    let n = Math.floor(num);
    let position = 0;

    while (n > 0) {
        const digit = n % 10;

        if (digit !== 0) {
            let digitWord = DIGIT_TO_THAI[digit];

            // Special cases
            if (position === 1) {
                if (digit === 1) digitWord = '';
                else if (digit === 2) digitWord = 'ยี่';
            }
            if (position === 0 && digit === 1 && Math.floor(num / 10) % 10 !== 0) {
                digitWord = 'เอ็ด';
            }

            result = digitWord + positions[position] + result;
        }

        n = Math.floor(n / 10);
        position++;

        // Reset position for millions
        if (position > 6) position = 1;
    }

    return result || 'ศูนย์';
}

function thaiTextToNumber(text: string): number {
    let result = 0;
    let current = 0;

    // Simple parsing
    for (const word of Object.keys(THAI_NUMBER_WORDS).sort((a, b) => b.length - a.length)) {
        while (text.includes(word)) {
            const value = THAI_NUMBER_WORDS[word];
            if (value >= 10) {
                if (current === 0) current = 1;
                current *= value;
                if (value >= 1000000) {
                    result += current;
                    current = 0;
                }
            } else {
                current += value;
            }
            text = text.replace(word, '');
        }
    }

    return result + current;
}

function isConsonant(char: string): boolean {
    return THAI_CONSONANTS.includes(char);
}

function isVowel(char: string): boolean {
    return THAI_VOWELS.includes(char);
}

function isToneMark(char: string): boolean {
    return THAI_TONES.includes(char);
}

function isThaiText(text: string): boolean {
    const thaiPattern = /[\u0E00-\u0E7F]/;
    return thaiPattern.test(text);
}

function countSyllables(text: string): number {
    // Rough estimation based on vowels
    const vowelPattern = /[ะาิีึืุูเแโใไำ]/g;
    const matches = text.match(vowelPattern);
    return matches ? matches.length : 0;
}

function convertThaiDigits(text: string): string {
    let result = '';
    for (const char of text) {
        if (THAI_DIGITS[char] !== undefined) {
            result += THAI_DIGITS[char];
        } else {
            result += char;
        }
    }
    return result;
}

function toThaiDigits(text: string): string {
    const thaiDigitChars = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    let result = '';
    for (const char of String(text)) {
        const digit = parseInt(char);
        if (!isNaN(digit) && digit >= 0 && digit <= 9) {
            result += thaiDigitChars[digit];
        } else {
            result += char;
        }
    }
    return result;
}

function removeToneMarks(text: string): string {
    return text.replace(/[่้๊๋]/g, '');
}

// ==========================================
// EXPORTS
// ==========================================

export {
    segmentThai as tat,
    romanize as roman,
    numberToThaiText as lekPenKum,
    thaiTextToNumber as kumPenLek,
    isConsonant as phaYanChaNa,
    isVowel as sara,
    isToneMark as wanYuk,
    isThaiText as penThai,
    countSyllables as napPhaYang,
    convertThaiDigits as plaengLekThai,
    toThaiDigits as penLekThai,
    removeToneMarks as lopWanYuk
};
