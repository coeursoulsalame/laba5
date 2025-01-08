const fs = require('fs');
const readline = require('readline');

const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
const ALPHABET_SIZE = ALPHABET.length; // 33 ё тож учитываем

function getIndexOfCoincidence(column) {
  // Считаем встречаемость для каждого символа алфавита
    let freq = new Array(ALPHABET_SIZE).fill(0);
    for (let ch of column) {
        let idx = ALPHABET.indexOf(ch);
        if (idx !== -1) {
            freq[idx]++;
        }
    }
  // Вычисляем индекс совпадения
    let N = column.length;
    let sum = 0;
    for (let i = 0; i < ALPHABET_SIZE; i++) {
        sum += freq[i] * (freq[i] - 1);
    }
    let ioc = 0;
    if (N > 1) {
        ioc = sum / (N * (N - 1));
    }

    return { freq, ioc };
}

function getMutualIoC(freq0, freq1, step, size0, size1) {
    // Проворачиваем freq1 на step
    // если step=1 то количество А (freq1[0]) переходит в freq1[1]
    let rotated = new Array(ALPHABET_SIZE);
    for (let i = 0; i < ALPHABET_SIZE; i++) {
        rotated[(i + step) % ALPHABET_SIZE] = freq1[i];
    }

    let sum = 0;
    for (let i = 0; i < ALPHABET_SIZE; i++) {
        sum += freq0[i] * rotated[i];
    }
    return sum / (size0 * size1);
}

function vigenereDecrypt(text, key) {
    let result = [];
    let j = 0; // индекс по ключу
    for (let ch of text) {
        let idx = ALPHABET.indexOf(ch);
        if (idx !== -1) {
            let keyIdx = ALPHABET.indexOf(key[j]);
            let decIdx = (idx - keyIdx + ALPHABET_SIZE) % ALPHABET_SIZE;
            result.push(ALPHABET[decIdx]);

            j = (j + 1) % key.length;
        } else {
            result.push(ch);
        }
    }
    return result.join('');
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const inputPath = await question(rl, "Введите путь к зашифрованному файлу: ");
    let text;
    try {
        text = fs.readFileSync(inputPath, 'utf8');
    } catch (error) {
        console.error(error);
        rl.close();
        return;
    }
    const lks = 5;

    let columns = Array.from({ length: lks }, () => []);
  
    let n = 0;
    for (let ch of text) {
        columns[n].push(ch);
        n = (n + 1) % lks;
    }

    let freqArray = [];
    let iocArray = [];
    for (let i = 0; i < lks; i++) {
        let { freq, ioc } = getIndexOfCoincidence(columns[i]);
        freqArray.push(freq);
        iocArray.push(ioc);
        console.log(`Индекс совпадения для столбца ${i+1} = ${ioc.toFixed(4)}`);
    }

    let relShift = new Array(lks - 1).fill(0);

    let size0 = columns[0].length; 
    for (let i = 1; i < lks; i++) {
        let sizeI = columns[i].length;
        let foundShift = null;
        for (let step = 0; step < ALPHABET_SIZE; step++) {
            let mutual = getMutualIoC(freqArray[0], freqArray[i], step, size0, sizeI);
            if (mutual > 0.05) {
                foundShift = step;
                console.log(`Взаимный индекс совпадения между столбцом 1 и столбцом ${i+1} = ${mutual.toFixed(4)}`);
                console.log(`Относительный сдвиг = ${foundShift}`);
                break;
            }
        }
        if (foundShift === null) {
            foundShift = 0;
        }
        relShift[i - 1] = foundShift;
    }

    console.log("\nВозможные варианты 5-буквенных ключей:");
    let possibleKeys = [];
    for (let firstIdx = 0; firstIdx < ALPHABET_SIZE; firstIdx++) {
        let keyStr = ALPHABET[firstIdx];
        for (let i = 0; i < relShift.length; i++) {
            let pos = relShift[i];
            let newIdx = (firstIdx - pos + ALPHABET_SIZE) % ALPHABET_SIZE;
            keyStr += ALPHABET[newIdx];
        }
        possibleKeys.push(keyStr);
    }

    for (let k of possibleKeys) {
        console.log(k);
    }

    const userKey = await question(rl, "\nВыберите и введите осмысленное слово из списка (или любой другой 5-буквенный): ");

    let decryptedText = vigenereDecrypt(text, userKey);

    const outputPath = await question(rl, "Введите путь для сохранения расшифрованного текста: ");
    try {
        fs.writeFileSync(outputPath, decryptedText, 'utf8');
        console.log("Файл успешно сохранён:", outputPath);
    } catch (error) {
        console.error(error);
    }

    rl.close();
}

function question(rl, q) {
    return new Promise(resolve => {
        rl.question(q, answer => {
            resolve(answer);
        });
    });
}

main().catch(console.error);