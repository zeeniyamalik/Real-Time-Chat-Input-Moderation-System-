function checkOffensive(text) {

    text = text.toLowerCase();
    text = text.replace(/@/g, "a");
    text = text.replace(/4/g, "a");
    text = text.replace(/\$/g, "s");
    text = text.replace(/0/g, "o");

    let badWords = [
        "badword",
        "spamword"
    ];

    for (let word of badWords) {

        if (text.includes(word)) {
            return true;
        }
    }

    return false;
}